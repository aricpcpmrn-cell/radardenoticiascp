import { GoogleGenAI } from '@google/genai';
import { NewsItem } from '../types/radar.ts';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

// Cascade list of free models on OpenRouter in case the primary 550B free model is queueing
// Note: OpenRouter strictly enforces that 'models' array must contain 3 items or fewer
const FREE_MODELS_CASCADE = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
];

export interface EnrichmentResult {
  url: string;
  criticality: 'CRITICO_URGENTE' | 'RELEVANTE' | 'NORMAL';
  executiveSummary: string[];
  policeUnit?: string;
}

export interface AIServiceStatus {
  provider: 'openrouter' | 'gemini' | 'heuristic';
  model: string;
  configured: boolean;
}

// Check configuration status
export function getAIStatus(): AIServiceStatus {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  if (openRouterKey && openRouterKey.trim().length > 0) {
    return {
      provider: 'openrouter',
      model,
      configured: true,
    };
  } else if (geminiKey && geminiKey.trim().length > 0) {
    return {
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      configured: true,
    };
  }

  return {
    provider: 'heuristic',
    model: 'Extrator Nativo RN',
    configured: false,
  };
}

/**
 * Call OpenRouter API with model nvidia/nemotron-3-ultra-550b-a55b:free
 * Supports fallback cascade models and extended 25s timeout for ultra-large models.
 */
async function callOpenRouter(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  timeoutMs: number = 25000
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://radar-cpc.vercel.app');
  // OpenRouter strictly rejects requests if 'models' has > 3 items
  const models = Array.from(new Set([model, ...FREE_MODELS_CASCADE])).slice(0, 3);

  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': appUrl,
      'X-Title': 'Radar de Noticias CPC PMRN',
    },
    body: JSON.stringify({
      model,
      models,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from OpenRouter API');
  }

  return text;
}

/**
 * Enrich police news articles with executive summaries using OpenRouter.ai (nvidia/nemotron-3-ultra-550b-a55b:free)
 * Includes graceful fallback to Gemini and native heuristic parsing.
 */
export async function enrichArticlesWithAI(articles: NewsItem[]): Promise<{
  articles: NewsItem[];
  providerUsed: 'openrouter' | 'gemini' | 'heuristic';
  modelUsed: string;
}> {
  if (!articles || articles.length === 0) {
    return { articles: [], providerUsed: 'heuristic', modelUsed: 'none' };
  }

  const targetModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  // Prepare input payload with verified real URLs (send top 4 concise items to minimize token latency)
  const inputList = articles.slice(0, 4).map(a => ({
    title: a.title,
    desc: (a.executiveSummary?.[0] || a.title).slice(0, 160),
    source: a.source,
    url: a.url,
  }));

  const systemPrompt = `Você é um analista sênior de inteligência policial do Comando de Policiamento da Capital (CPC/PMRN).
Sua missão é analisar matérias REAIS de segurança pública do Rio Grande do Norte e gerar resumos executivos objetivos e diretos.
Regras estritas:
1. Mantenha RIGOROSAMENTE a mesma URL exata recebida em cada matéria. NUNCA altere ou invente URLs.
2. Cada resumo executivo deve ter de 2 a 3 tópicos curtos (fatos essenciais, apreensões/prisões e desfecho).
3. Classifique a criticidade em "CRITICO_URGENTE", "RELEVANTE" ou "NORMAL".
4. Responda ESTRITAMENTE em formato JSON puro (array de objetos).`;

  const userPrompt = `Analise estas matérias policiais do RN e responda em formato JSON:
${JSON.stringify(inputList, null, 2)}

Formato JSON esperado:
[
  {
    "url": "mesma url exata recebida",
    "criticality": "CRITICO_URGENTE" | "RELEVANTE" | "NORMAL",
    "executiveSummary": ["tópico 1", "tópico 2"],
    "policeUnit": "unidade policial identificada"
  }
]`;

  // 1. Try OpenRouter first (with nvidia/nemotron-3-ultra-550b-a55b:free)
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
    try {
      const openRouterResponse = await callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], targetModel, 12000);

      const parsed = parseEnrichmentJson(openRouterResponse);
      if (parsed && parsed.length > 0) {
        const enriched = mergeEnrichments(articles, parsed);
        return {
          articles: enriched,
          providerUsed: 'openrouter',
          modelUsed: targetModel,
        };
      }
    } catch (err: any) {
      console.info(`[AIService] OpenRouter notice (${targetModel}): ${err?.message || 'operation timed out'}. Preserving verified news data.`);
    }
  }

  // 2. Try Gemini fallback if configured
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 6000)
      );

      const geminiRes = await Promise.race([geminiPromise, timeoutPromise]);
      const parsed = parseEnrichmentJson(geminiRes.text || '');
      if (parsed && parsed.length > 0) {
        return {
          articles: mergeEnrichments(articles, parsed),
          providerUsed: 'gemini',
          modelUsed: 'gemini-3.8-flash',
        };
      }
    } catch (geminiErr: any) {
      const isQuota = /429|quota|RESOURCE_EXHAUSTED/i.test(geminiErr?.message || '');
      if (isQuota) {
        console.info('[AIService] Gemini free tier quota unavailable; continuing with native verified extractor.');
      } else {
        console.info('[AIService] Gemini fallback unavailable, using native extractor.');
      }
    }
  }

  // 3. Graceful fallback: return articles with their real journalists' summaries and tags
  return {
    articles,
    providerUsed: 'heuristic',
    modelUsed: 'Extrator Nativo RN',
  };
}

/**
 * Generate daily WhatsApp bulletin using OpenRouter.ai (nvidia/nemotron-3-ultra-550b-a55b:free)
 */
export async function synthesizeWhatsAppReport(
  articles: NewsItem[],
  region: string,
  command: string,
  dateLabel: string
): Promise<{ reportText: string; providerUsed: 'openrouter' | 'gemini' | 'heuristic'; modelUsed: string }> {
  const targetModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const promptArticles = articles.slice(0, 6).map(a => ({
    title: a.title,
    location: a.location,
    source: a.source,
    url: a.url,
    summary: Array.isArray(a.executiveSummary) ? a.executiveSummary.slice(0, 2) : [],
    crit: a.criticality,
    unit: a.policeUnit,
  }));

  const systemPrompt = `Você é o Chefe de Inteligência e Comunicação Social do Comando de Policiamento da Capital (CPC / PMRN).
Elabore o *BOLETIM DIÁRIO DE INTELIGÊNCIA E MONITORAMENTO DE NOTÍCIAS* estruturado para compartilhamento no WhatsApp com dados de matérias REAIS do Rio Grande do Norte.

Regras estritas de formatação para WhatsApp:
- Use *negrito* para títulos, números e termos-chave.
- Use _itálico_ para fontes e observações.
- Use emojis táticos sóbrios (🚨 para urgente, ⚠️ para atenção, 📋 para tópicos, 📍 para localização, 🔗 para links originais).
- CRÍTICO: Para CADA matéria citada, inclua OBRIGATORIAMENTE a URL direta original do campo "url" (ex: 🔗 Matéria completa: [url]), sem encurtar nem modificar.
- Não invente ocorrências ou links fora dos dados fornecidos.`;

  const userPrompt = `Matérias reais monitoradas em ${region} (${command}) na data ${dateLabel}:
${JSON.stringify(promptArticles, null, 2)}

Estrutura do relatório:
1. *RADAR DE NOTÍCIAS CPC | BOLETIM OPERACIONAL DIÁRIO*
2. Data: ${dateLabel} | Região: ${region} (${command})
3. *PANORAMA GERAL DO TURNO*: Síntese executiva do cenário de segurança pública no RN (2 a 3 parágrafos curtos).
4. *OCORRÊNCIAS CRÍTICAS E URGENTES* (com resumo e link direto da matéria).
5. *DESTAQUES DE OPERAÇÕES E APREENSÕES* (com resumo e link direto da matéria).
6. *INDICADORES E TENDÊNCIAS OBSERVADAS* (resumo de inteligência).
7. Rodapé institucional: _Radar de Notícias CPC — Automatização e Inteligência Operacional (${targetModel})_

Gere a mensagem pronta para envio no WhatsApp.`;

  // 1. Try OpenRouter
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
    try {
      const openRouterReport = await callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], targetModel, 14000);

      if (openRouterReport && openRouterReport.trim().length > 50) {
        return {
          reportText: openRouterReport.trim(),
          providerUsed: 'openrouter',
          modelUsed: targetModel,
        };
      }
    } catch (err: any) {
      console.info(`[AIService] OpenRouter report notice (${targetModel}): ${err?.message || 'timeout'}. Using structured operational template.`);
    }
  }

  // 2. Try Gemini fallback
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
      });

      if (geminiRes.text && geminiRes.text.trim().length > 50) {
        return {
          reportText: geminiRes.text.trim(),
          providerUsed: 'gemini',
          modelUsed: 'gemini-3.8-flash',
        };
      }
    } catch (geminiErr: any) {
      const isQuota = /429|quota|RESOURCE_EXHAUSTED/i.test(geminiErr?.message || '');
      if (isQuota) {
        console.info('[AIService] Gemini quota unavailable for report; falling back to native operational template.');
      } else {
        console.info('[AIService] Gemini report synthesis unavailable; using native operational template.');
      }
    }
  }

  // 3. Fallback: structured template engine
  return {
    reportText: buildFallbackReport(articles, region, command, dateLabel, targetModel),
    providerUsed: 'heuristic',
    modelUsed: 'Gerador Tático Nativo',
  };
}

// Helper to parse JSON from AI response
function parseEnrichmentJson(text: string): EnrichmentResult[] | null {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const candidate = jsonMatch[1] || jsonMatch[0];
      const raw = JSON.parse(candidate);
      if (Array.isArray(raw)) {
        return raw;
      }
    }
    const direct = JSON.parse(text.trim());
    if (Array.isArray(direct)) {
      return direct;
    }
  } catch {
    // ignore parse error and proceed to fallback
  }
  return null;
}

// Helper to merge AI enrichments into original news items
function mergeEnrichments(originals: NewsItem[], enriched: EnrichmentResult[]): NewsItem[] {
  return originals.map(original => {
    const match = enriched.find(e => e.url === original.url);
    if (match) {
      return {
        ...original,
        criticality: ['CRITICO_URGENTE', 'RELEVANTE', 'NORMAL'].includes(match.criticality)
          ? match.criticality
          : original.criticality,
        executiveSummary:
          Array.isArray(match.executiveSummary) && match.executiveSummary.length > 0
            ? match.executiveSummary
            : original.executiveSummary,
        policeUnit: match.policeUnit || original.policeUnit,
      };
    }
    return original;
  });
}

// Fallback report generator
function buildFallbackReport(
  articles: NewsItem[],
  region: string,
  command: string,
  dateLabel: string,
  modelName: string
): string {
  let text = `*RADAR DE NOTÍCIAS CPC | BOLETIM OPERACIONAL DIÁRIO*\n`;
  text += `📅 *Data:* ${dateLabel} | 📍 *Região:* ${region} (${command})\n`;
  text += `🤖 *Motor de IA:* OpenRouter (${modelName})\n\n`;
  text += `📋 *PANORAMA GERAL DO TURNO:*\nMonitoramento consolidado de matérias de segurança pública, patrulhamento ostensivo e inteligência policial no Estado do Rio Grande do Norte.\n\n`;

  const urgent = articles.filter(a => a.criticality === 'CRITICO_URGENTE');
  if (urgent.length > 0) {
    text += `🚨 *OCORRÊNCIAS CRÍTICAS E URGENTES (${urgent.length}):*\n`;
    urgent.forEach((item, idx) => {
      text += `\n*${idx + 1}. ${item.title}*\n`;
      text += `📍 _${item.location}_ · Fonte: _${item.source}_\n`;
      item.executiveSummary.forEach(p => {
        text += `  • ${p}\n`;
      });
      text += `  🔗 Matéria completa: ${item.url}\n`;
    });
    text += `\n─────────────────────\n\n`;
  }

  const others = articles.filter(a => a.criticality !== 'CRITICO_URGENTE');
  if (others.length > 0) {
    text += `📋 *DESTAQUES DE OPERAÇÕES E APREENSÕES (${others.length}):*\n`;
    others.forEach((item, idx) => {
      const marker = item.criticality === 'RELEVANTE' ? '🟠' : '🟢';
      text += `\n${marker} *${idx + 1}. ${item.title}*\n`;
      text += `📍 _${item.location}_ · Fonte: _${item.source}_\n`;
      item.executiveSummary.forEach(p => {
        text += `  • ${p}\n`;
      });
      text += `  🔗 Matéria completa: ${item.url}\n`;
    });
    text += `\n─────────────────────\n\n`;
  }

  text += `_Radar de Notícias CPC — Automatização e Inteligência Operacional_\n`;
  text += `_PMRN / SESED · Sem custos com banco de dados_`;

  return text;
}
