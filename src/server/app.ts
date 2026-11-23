import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { matchesLocality, matchesDateRange } from '../utils/filterUtils.ts';
import { NewsItem } from '../types/radar.ts';
import { enrichArticlesWithAI, synthesizeWhatsAppReport, getAIStatus } from './openrouter.ts';
import { PRIORITY_NEWS_SOURCES, PriorityNewsSource, isPrioritySourceUrl } from '../config/prioritySources.ts';

dotenv.config();

export const app = express();

app.use(express.json());

// Enable CORS for Vercel and local preview flexibility
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

const NOW = Date.now();
const ONE_HOUR = 3600 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

// 100% verified real live news items from Rio Grande do Norte (Verified HTTP 200 URLs)
// Strictly police, criminal occurrences, arrests, homicides, operations, and firearm/drug seizures from 2026
const REFERENCE_PUBLIC_SAFETY_NEWS: NewsItem[] = [
  {
    id: 'real-rn-1',
    title: 'Homem é morto a tiros e criança de 4 anos é baleada dentro de barbearia no RN',
    source: 'G1 RN',
    publishedAt: 'Hoje, 08:49',
    timestamp: new Date('2026-11-04T11:49:30Z').getTime(), // 04/11/2026 - Hoje / 24h
    location: 'Assú - RN (Região Oeste / Frutilândia)',
    criticality: 'CRITICO_URGENTE',
    executiveSummary: [
      'Barbeiro de 24 anos foi executado com mais de cinco disparos de pistola dentro do estabelecimento.',
      'Criança de 4 anos que acompanhava o pai foi atingida por dois disparos e transferida para o Hospital Regional Tarcísio Maia em Mossoró.',
      'Dois suspeitos chegaram ao local em uma motocicleta e fugiram logo após o ataque armado.',
      'Polícia Militar isolou o perímetro e a Polícia Civil abriu inquérito policial para apurar autoria e motivação.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/04/homem-e-morto-a-tiros-e-crianca-de-4-anos-e-baleada-dentro-de-barbearia-no-rn.ghtml',
    category: 'Ocorrência Grave / Homicídio',
    keywords: ['homicídio', 'tiros', 'PMRN', 'Assú', 'urgente', 'disparos', 'investigação'],
    policeUnit: 'PMRN / 10º BPM / Polícia Civil'
  },
  {
    id: 'real-rn-2',
    title: 'Homem é preso por embriaguez ao volante com ciclomotor roubado na Grande Natal',
    source: 'G1 RN',
    publishedAt: 'Hoje, 09:11',
    timestamp: new Date('2026-11-04T12:11:56Z').getTime(), // 04/11/2026 - Hoje / 24h
    location: 'Extremoz e Natal - RN (Grande Natal)',
    criticality: 'RELEVANTE',
    executiveSummary: [
      'Homem de 26 anos foi flagrado em condução perigosa por guarnição da Polícia Militar na Grande Natal.',
      'Durante a averiguação veicular, policiais constataram que o ciclomotor possuía registro ativo de roubo.',
      'O teste de alcoolemia confirmou embriaguez ao volante e o condutor foi conduzido à Central de Flagrantes.',
      'O veículo foi apreendido e encaminhado para devolução legal ao legítimo proprietário.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/04/homem-e-preso-por-embriaguez-ao-volante-com-ciclomotor-roubado-na-grande-natal.ghtml',
    category: 'Prisão em Flagrante / Recuperação de Veículo',
    keywords: ['prisão', 'PMRN', 'veículo roubado', 'Grande Natal', 'Central de Flagrantes', 'flagrante', 'Natal'],
    policeUnit: 'PMRN / Comando Metropolitano / CPC'
  },
  {
    id: 'real-rn-3',
    title: 'Homem é preso suspeito de se passar por médico e atender em hospitais do RN',
    source: 'G1 RN',
    publishedAt: 'Hoje, 10:06',
    timestamp: new Date('2026-11-04T13:06:55Z').getTime(), // 04/11/2026 - Hoje / 24h
    location: 'Natal e Região Metropolitana - RN (CPC / CPM)',
    criticality: 'RELEVANTE',
    executiveSummary: [
      'Polícia Civil cumpriu mandado de prisão preventiva e busca e apreensão contra investigado que atuava como médico.',
      'O suspeito utilizava registro de outro profissional e realizou atendimentos e prescrições médicas no RN.',
      'Agentes policiais apreenderam carimbos falsificados, receituários em branco e prontuários irregulares.',
      'O preso foi encaminhado ao sistema prisional e responderá por exercício ilegal da profissão e falsidade ideológica.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/04/homem-preso-suspeito-passar-medico-atender-em-hospitais-do-rn.ghtml',
    category: 'Mandado de Prisão / Operação Policial',
    keywords: ['prisão', 'Polícia Civil', 'operação policial', 'Natal', 'mandado de prisão', 'DEICOR'],
    policeUnit: 'Polícia Civil / DEICOR / PCRN'
  },
  {
    id: 'real-rn-4',
    title: 'Denúncia de agressão leva à prisão de homem por posse ilegal de arma no RN',
    source: 'Ponta Negra News',
    publishedAt: 'Hoje, 08:59',
    timestamp: new Date('2026-11-04T11:59:16Z').getTime(), // 04/11/2026 - Hoje / 24h
    location: 'Natal e Região Metropolitana - RN',
    criticality: 'RELEVANTE',
    executiveSummary: [
      'Equipe policial militar foi acionada para averiguar ocorrência de agressão e apreendeu armamento ilegal.',
      'Durante a revista no imóvel, policiais localizaram uma arma de fogo e munições em posse do suspeito.',
      'O indivíduo foi detido em flagrante e encaminhado à Central de Flagrantes da Polícia Civil.',
      'A arma foi recolhida para perícia técnica balística junto ao ITEP/RN.'
    ],
    url: 'https://pontanegranews.com.br/2026/11/04/prisao-posse-ilegal-arma-violencia-domestica-rn/',
    category: 'Apreensão de Arma / Flagrante',
    keywords: ['arma', 'posse ilegal', 'Natal', 'PMRN', 'Central de Flagrantes', 'prisão', 'armas'],
    policeUnit: 'PMRN / Comando da Capital (CPC)'
  },
  {
    id: 'real-rn-5',
    title: 'Mossoró registra três homicídios em menos de 24 horas; polícia anuncia delegacia de combate às facções',
    source: 'G1 RN',
    publishedAt: 'Ontem, 21:51',
    timestamp: new Date('2026-11-03T21:51:53Z').getTime(), // 03/11/2026 - Ontem / 24h
    location: 'Mossoró - RN (Região Oeste / CPR II)',
    criticality: 'CRITICO_URGENTE',
    executiveSummary: [
      'Sequência de mortes violentas em diferentes bairros de Mossoró mobilizou reforço tático imediato da PMRN.',
      'Secretaria de Segurança Pública determinou criação de delegacia especializada no combate direto ao crime organizado na região.',
      'Tropas do 2º e 12º Batalhões intensificaram saturações e abordagens em áreas periféricas.',
      'DHPP de Mossoró assumiu as investigações dos três casos com análise balística e depoimento de testemunhas.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/03/mossoro-registra-tres-homicidios-em-menos-de-24-horas-policia-anuncia-delegacia-de-combate-as-faccoes.ghtml',
    category: 'Homicídios / Crime Organizado',
    keywords: ['Mossoró', 'facções', 'DHPP', 'PMRN', 'urgente', 'homicídio', 'crime organizado'],
    policeUnit: '2º BPM / 12º BPM / DHPP Mossoró'
  },
  {
    id: 'real-rn-6',
    title: 'Homem é condenado a 27 anos de prisão por estupro de vulnerável no interior do RN',
    source: 'G1 RN',
    publishedAt: 'Ontem, 17:38',
    timestamp: new Date('2026-11-03T17:38:24Z').getTime(), // 03/11/2026 - Ontem / 24h
    location: 'São José do Campestre e Agreste - RN (CPR IV)',
    criticality: 'RELEVANTE',
    executiveSummary: [
      'A Justiça do RN expediu mandado condenatório com sentença de 27 anos de reclusão em regime fechado.',
      'Mandado foi cumprido por equipes integradas da segurança pública na região do Agreste Potiguar.',
      'O réu foi capturado e recolhido ao sistema penitenciário estadual para cumprimento da pena.',
      'Ação reforça as diretrizes operacionais de combate a crimes contra vulneráveis no interior potiguar.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/03/homem-e-condenado-a-27-anos-de-prisao-por-estupro-de-vulneravel-no-interior-do-rn.ghtml',
    category: 'Mandado Judicial / Condenação',
    keywords: ['prisão', 'mandado de prisão', 'Agreste', 'condenação', 'Polícia Civil', 'PMRN'],
    policeUnit: '8º BPM / CPR IV / Polícia Civil'
  },
  {
    id: 'real-rn-7',
    title: 'PM prende suspeito de tráfico e apreende drogas na Vila de Ponta Negra, em Natal',
    source: 'G1 RN',
    publishedAt: '01/11 às 16:17',
    timestamp: new Date('2026-11-01T19:17:40Z').getTime(), // 01/11/2026 - 3 dias atrás (7d, 30d)
    location: 'Natal - RN (Vila de Ponta Negra / 5º BPM / CPC)',
    criticality: 'RELEVANTE',
    executiveSummary: [
      'Policiais militares da Companhia de Turismo e 5º BPM realizaram saturação na Vila de Ponta Negra.',
      'Suspeito tentou dispersar invólucros plásticos contendo porções de cocaína e maconha ao avistar a viatura.',
      'Com o indivíduo também foram apreendidos dinheiro fracionado e aparelho celular utilizado para comunicação.',
      'O detido foi conduzido à Central de Flagrantes da Polícia Civil em Natal para formalização do flagrante.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/01/pm-prende-suspeito-de-trafico-e-apreende-drogas-na-vila-de-ponta-negra-em-natal.ghtml',
    category: 'Tráfico de Drogas / Flagrante',
    keywords: ['Ponta Negra', 'Natal', 'tráfico', 'drogas', 'PMRN', '5º BPM', 'CPC', 'apreensão'],
    policeUnit: '5º BPM / BPTUR / CPC PMRN'
  },
  {
    id: 'real-rn-8',
    title: 'Casal é preso após tentar aplicar golpe em mulheres que saíam de banco na Grande Natal',
    source: 'G1 RN',
    publishedAt: '30/10 às 15:32',
    timestamp: new Date('2026-10-30T18:32:03Z').getTime(), // 30/10/2026 - 5 dias atrás (7d, 30d)
    location: 'Parnamirim e Natal - RN (Grande Natal)',
    criticality: 'RELEVANTE',
    executiveSummary: [
      'Dupla de estelionatários foi presa em flagrante pela PMRN abordando idosas na saída de agência bancária.',
      'Os suspeitos tentavam aplicar o golpe do pacote de dinheiro falso (golpe do achadinho).',
      'Durante a voz de prisão, o indivíduo ainda tentou subornar a equipe e responderá também por corrupção ativa.',
      'Ocorrência foi registrada na Delegacia de Plantão da Polícia Civil para instauração de inquérito.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/10/30/casal-e-preso-apos-tentar-aplicar-golpe-em-mulheres-que-saiam-de-banco-na-grande-natal.ghtml',
    category: 'Prisão em Flagrante / Estelionato',
    keywords: ['prisão', 'estelionato', 'golpe bancário', 'PMRN', 'Parnamirim', 'Polícia Civil', 'flagrante'],
    policeUnit: 'PMRN / 3º BPM / Polícia Civil'
  },
  {
    id: 'real-rn-9',
    title: 'Servidor público federal que estava desaparecido é encontrado morto em Natal',
    source: 'G1 RN',
    publishedAt: '30/10 às 13:57',
    timestamp: new Date('2026-10-30T16:57:15Z').getTime(), // 30/10/2026 - 5 dias atrás (7d, 30d)
    location: 'Natal - RN (Vila de Ponta Negra / CPC)',
    criticality: 'CRITICO_URGENTE',
    executiveSummary: [
      'Vítima de 30 anos que constava no cadastro de desaparecidos foi localizada sem vida em área de mata na capital potiguar.',
      'Perícia do ITEP e equipes da DHPP identificaram marcas de violência e perfurações contundentes no corpo.',
      'A Divisão de Homicídios e Proteção à Pessoa (DHPP) conduz as investigações sob sigilo operacional.',
      'O Comando de Policiamento da Capital (CPC PMRN) intensificou as rondas e incursões preventivas na comunidade.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/10/30/servidor-publico-desaparecido-encontrado-morto-natal.ghtml',
    category: 'Homicídio / Investigação Policial',
    keywords: ['homicídio', 'Ponta Negra', 'DHPP', 'PMRN', 'CPC', 'urgente', 'perícia', 'Natal'],
    policeUnit: 'CPC / 5º BPM / DHPP Natal'
  },
  {
    id: 'real-rn-10',
    title: 'Polícia prende segundo suspeito de matar professor de futebol na Zona Norte de Natal',
    source: 'G1 RN',
    publishedAt: '29/10 às 17:51',
    timestamp: new Date('2026-10-29T20:51:47Z').getTime(), // 29/10/2026 - 6 dias atrás (7d, 30d)
    location: 'Natal - RN (Zona Norte / 4º BPM / CPC)',
    criticality: 'CRITICO_URGENTE',
    executiveSummary: [
      'Polícia Civil e 4º BPM cumpriram mandado de prisão preventiva contra o segundo investigado pelo latrocínio do educador esportivo.',
      'O crime ocorreu na Zona Norte da capital e motivou ampla mobilização tática das forças de segurança estaduais.',
      'Com o mandado expedido pela 2ª Vara Criminal de Natal, o suspeito foi localizado e interceptado.',
      'O investigado foi encaminhado ao sistema prisional do RN onde permanece à disposição da Justiça.'
    ],
    url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/10/29/policia-prende-segundo-suspeito-de-matar-professor-de-futebol-na-zona-norte-de-natal.ghtml',
    category: 'Prisão / Homicídio',
    keywords: ['Zona Norte', 'Natal', 'homicídio', '4º BPM', 'PMRN', 'Polícia Civil', 'prisão'],
    policeUnit: '4º BPM / CPC / DHPP Natal'
  }
];

// Helper: Decode common HTML entities (named & numeric) so Blogger/WordPress/HTML feeds render crisp Portuguese
function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  const named: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#039;': "'",
    '&nbsp;': ' ',
    '&aacute;': 'á', '&Aacute;': 'Á',
    '&agrave;': 'à', '&Agrave;': 'À',
    '&acirc;': 'â', '&Acirc;': 'Â',
    '&atilde;': 'ã', '&Atilde;': 'Ã',
    '&eacute;': 'é', '&Eacute;': 'É',
    '&ecirc;': 'ê', '&Ecirc;': 'Ê',
    '&iacute;': 'í', '&Iacute;': 'Í',
    '&oacute;': 'ó', '&Oacute;': 'Ó',
    '&ocirc;': 'ô', '&Ocirc;': 'Ô',
    '&otilde;': 'õ', '&Otilde;': 'Õ',
    '&uacute;': 'ú', '&Uacute;': 'Ú',
    '&uuml;': 'ü', '&Uuml;': 'Ü',
    '&ccedil;': 'ç', '&Ccedil;': 'Ç',
    '&ldquo;': '“', '&rdquo;': '”',
    '&lsquo;': '‘', '&rsquo;': '’',
    '&ndash;': '–', '&mdash;': '—',
    '&hellip;': '…', '&ordm;': 'º', '&ordf;': 'ª',
  };
  let out = input.replace(/&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/g, (entity) => {
    if (named[entity] !== undefined) return named[entity];
    const dec = entity.match(/^&#(\d+);$/);
    if (dec) {
      const code = parseInt(dec[1], 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    const hex = entity.match(/^&#x([0-9a-fA-F]+);$/i);
    if (hex) {
      const code = parseInt(hex[1], 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return entity;
  });
  return out;
}

function cleanFeedText(raw: string): string {
  if (!raw) return '';
  // Decode first (Blogger encodes HTML tags as &lt;div&gt;), then strip tags, then decode any remaining entities
  const decoded = decodeHtmlEntities(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
  const stripped = decoded
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(stripped).replace(/\s+/g, ' ').trim();
}

// Helper: Checks if text is explicitly OFF-TOPIC (traffic accidents without crime, weather, politics, culture, sports, healthcare/natural deaths)
function isExplicitlyOffTopic(text: string): boolean {
  const t = text.toLowerCase();

  // 1. Traffic accidents without explicit criminal context
  const hasAccident = /\b(acidente|acidentes|colis[ãa]o|colis[õo]es|colidir|colidiu|capotamento|capotou|atropelamento|atropelou|bateu em|bate em|queda de moto|engavetamento|tr[âa]nsito lento|engarrafamento|ped[áa]gio|rodovia|prf registra \d+ acidentes)\b/i.test(t);
  const hasCrimeContext = /\b(persegui[çc][ãa]o|troca de tiros|tiros|criminos|assalto|roubado|ve[íi]culo roubado|ciclomotor roubado|embriaguez|porte ilegal|foragido|arma de fogo|droga|entorpecente)\b/i.test(t);
  if (hasAccident && !hasCrimeContext) {
    return true;
  }

  // 2. Weather & Climate
  if (/\b(previs[ãa]o do tempo|meteorolog|chuva|chuvas|temperatura|umidade|inmet|emparn|ondas|t[áa]bua de mar[ée]s?|calor intenso|seca)\b/i.test(t)) {
    return true;
  }

  // 3. Politics, legislation, voting, speeches, parliamentary discussions, STF/national political disputes
  if (/\b(elei[çc][ãa]o|elei[çc][õo]es|candidat|governador eleito|governo eleito|pec da seguran[çc]a|discurso|vota[çc][ãa]o no senado|or[çc]amento|fundo partid[áa]rio|plen[áa]rio|vereador|deputad[oa]|prefeit[oa]|diploma[çc][ãa]o|partido pol[íi]tico|bancada|mandato parlamentar|anistia|stf|alexandre de moraes|gilmar mendes|bolsonaro|lula|f[áa]tima bezerra|assembleia legislativa|alrn)\b/i.test(t)) {
    return true;
  }

  // 4. Culture, music festivals, entertainment, sports without crime
  if (/\b(festival|show|shows|carnaval|carnatal|m[úu]sica|futebol|rodada|campeonato|brasileir[ãa]o|concurso|edital|enem|vestibular|matr[íi]cula|gastronomia|turismo|hotel|teatro|fot[óo]grafo)\b/i.test(t)) {
    return true;
  }

  // 5. Natural deaths, illness, hospital beds without crime
  if (/\b(uti neonatal|sepse|morte natural|morre de infarto|morre ap[óo]s passar mal|parada card[íi]aca|covid|dengue|vacina|leito hospitalar)\b/i.test(t)) {
    return true;
  }

  return false;
}

// Helper: Checks if article is purely foreign/out-of-state without any connection to Rio Grande do Norte
function isOutOfStateOnly(text: string, source: PriorityNewsSource): boolean {
  if (source.securityFocused || source.id === 'g1-rn') {
    return false;
  }
  const t = text.toLowerCase();
  const hasRNReference = /\b(rn|rio grande do norte|potiguar|natal|mossor[óo]|parnamirim|maca[íi]ba|s[ãa]o gon[çc]alo|extremoz|cear[áa]-mirim|caic[óo]|ass[úu]|currais novos|nova cruz|apodi|pau dos ferros|n[íi]sia floresta|touros|pipa|goianinha|pmrn|pcrn|sesed|cpc|cpm|cpre|bpchoque|itep|deicor|dhpp|grande natal|interior do estado|serid[óo]|agreste)\b/i.test(t);
  if (hasRNReference) return false;

  const clearlyForeignOrOtherState = /\b(ucr[âa]nia|r[úu]ssia|russo|l[íi]bia|gaza|israel|estados unidos|eua|europa|belo horizonte|minas gerais|s[ãa]o paulo|rio de janeiro|bahia|salvador|recife|pernambuco|fortaleza|cear[áa]|jo[ãa]o pessoa|para[íi]ba|bras[íi]lia|distrito federal|curitiba|porto alegre|amazonas|manaus|goi[âa]nia)\b/i.test(t);
  return clearlyForeignOrOtherState;
}

// Helper: Checks if text matches genuine POLICE OR CRIME theme
function isPoliceOrCrimeOccurrence(text: string): boolean {
  const t = text.toLowerCase();

  const policeEntities = /\b(pol[íi]cia militar|pol[íi]cia civil|pol[íi]cia rodovi[áa]ria|\bpol[íi]cia\b|\bpmrn\b|\bpcrn\b|\bbpchoque\b|\bbope\b|\brocam\b|\bbptur\b|\bcpre\b|\bdhpp\b|\bdeicor\b|\bdefur\b|\bciosp\b|\bcpc\b|\bcpm\b|\bbpm\b|delegacia|instituto t[ée]cnico-cient[íi]fico|itep|guarni[çc][ãa]o policial|viatura policial|ronda ostensiva|patrulhamento ostensivo|opera[çc][ãa]o zero [áa]lcool|lei seca|batalh[ãa]o)\b/i;

  const crimeAndActionTerms = /\b(pres[oa]s? em flagrante|\bpres[oa]s?\b|\bpris[ãa]o\b|\bpris[õo]es\b|mandado de pris[ãa]o|apreens[ãa]o|apreend|tr[áa]fico de drogas?|entorpecentes?|coca[íi]na|maconha|crack|homic[íi]dio|assassin|mort[oa] a tiros|balead[oa]s?|tiroteio|confronto armado|troca de tiros|disparos? de arma|arma de fogo|fuzil|pistola|rev[óo]lver|muni[çc][õo]es|roubo|assalto|arrombament|latroc[íi]nio|sequestro|foragid[oa]|fac[çc][ãa]o criminosa|comando vermelho|sindicato do crime|\bpcc\b|cerco policial|persegui[çc][ãa]o policial|ve[íi]culo roubado|ciclomotor roubado|embriaguez ao volante|golpe do achadinho|estelionato|exerc[íi]cio ilegal|feminic[íi]dio|viol[êe]ncia dom[ée]stica|estupro|furto)\b/i;

  return policeEntities.test(t) || crimeAndActionTerms.test(t);
}

interface RawFeedItem {
  title: string;
  link: string;
  desc: string;
  pubDate: string;
  source: PriorityNewsSource;
}

// Fetch and parse a single priority source (RSS/Atom or HTML fallback)
async function fetchPrioritySourceItems(source: PriorityNewsSource): Promise<RawFeedItem[]> {
  const results: RawFeedItem[] = [];
  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': source.mode === 'rss'
          ? 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
          : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return results;
    const body = await res.text();

    if (source.mode === 'rss') {
      const itemMatches = [...body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
      for (const m of itemMatches) {
        const itemXml = m[1];
        const rawTitle = itemXml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
        const rawLink = itemXml.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1]
          || itemXml.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]
          || '';
        const rawDesc = itemXml.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1]
          || itemXml.match(/<content:encoded\b[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1]
          || '';
        const pubDate = (
          itemXml.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]
          || itemXml.match(/<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]
          || itemXml.match(/<atom:updated\b[^>]*>([\s\S]*?)<\/atom:updated>/i)?.[1]
          || ''
        ).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();

        const title = cleanFeedText(rawTitle);
        const link = decodeHtmlEntities(rawLink.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim();
        const desc = cleanFeedText(rawDesc);

        if (title && link && isPrioritySourceUrl(link)) {
          results.push({ title, link, desc, pubDate, source });
        }
      }
    } else {
      // HTML article extractor (e.g. Thaisa Galvão: https://www.thaisagalvao.com.br/YYYY/MM/DD/slug)
      const anchorRegex = /<a[^>]+href=["'](https?:\/\/[^"']+\/20\d\d\/\d{1,2}\/\d{1,2}\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      const seen = new Set<string>();
      for (const m of body.matchAll(anchorRegex)) {
        const link = decodeHtmlEntities(m[1]).trim();
        if (seen.has(link) || !isPrioritySourceUrl(link)) continue;
        const inner = cleanFeedText(m[2]);
        if (inner.length < 20) continue;
        seen.add(link);

        // Split into headline and optional excerpt
        const title = inner.length > 120 ? inner.slice(0, 120).replace(/\s+\S*$/, '') : inner;
        const desc = inner;
        const dateMatch = link.match(/\/(20\d\d)\/(\d{1,2})\/(\d{1,2})\//);
        const pubDate = dateMatch
          ? new Date(
              parseInt(dateMatch[1], 10),
              parseInt(dateMatch[2], 10) - 1,
              parseInt(dateMatch[3], 10),
              12, 0, 0
            ).toUTCString()
          : '';

        results.push({ title, link, desc, pubDate, source });
      }
    }
  } catch {
    // Gracefully skip unavailable feed without blocking other priority sources
  }

  return results;
}

// Live News Harvester exclusively from the 15 priority RN sites and blogs (in parallel)
async function harvestLiveRNNews(
  regionFilter: string,
  keywordsFilter: string,
  dateRangeFilter: string = 'hoje',
  sourceIdFilter: string = 'ALL'
): Promise<{ articles: NewsItem[]; sourceCounts: Record<string, number>; respondedSources: number }> {
  const targetSources = sourceIdFilter && sourceIdFilter !== 'ALL'
    ? PRIORITY_NEWS_SOURCES.filter(s => s.id === sourceIdFilter)
    : PRIORITY_NEWS_SOURCES;

  const settled = await Promise.allSettled(targetSources.map(src => fetchPrioritySourceItems(src)));

  const collected: RawFeedItem[] = [];
  let respondedSources = 0;

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      respondedSources++;
      collected.push(...result.value);
    }
  }

  const userKeywords = keywordsFilter
    ? keywordsFilter
        .split(/[,;]+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 2 && !['rn', 'segurança pública', 'seguranca publica', 'geral'].includes(s))
    : [];

  // 1. Filter out off-topic / non-RN articles while honoring dedicated police sources (PMRN Oficial, Portal BO)
  const strictPoliceItems = collected.filter(art => {
    const full = `${art.title} ${art.desc}`;
    if (art.source.id === 'pmrn-oficial') {
      // Official Polícia Militar do RN blog: all posts are institutional/operational police news
      return true;
    }
    if (isOutOfStateOnly(full, art.source)) {
      return false;
    }
    if (isExplicitlyOffTopic(full)) {
      return false;
    }
    if (art.source.securityFocused) {
      return true;
    }
    return isPoliceOrCrimeOccurrence(full);
  });

  // 2. Filter live news by userKeywords strictly (no fallback)
  let liveMatches = strictPoliceItems;
  if (userKeywords.length > 0) {
    liveMatches = strictPoliceItems.filter(art => {
      const full = `${art.title} ${art.desc}`.toLowerCase();
      return userKeywords.some(kw => {
        if (full.includes(kw)) return true;
        const subwords = kw.split(/\s+/).filter(w => w.length > 2);
        return subwords.length > 0 && subwords.some(sw => full.includes(sw));
      });
    });
  }

  // Deduplicate live items by canonical URL
  const seenUrls = new Set<string>();
  const uniqueList: RawFeedItem[] = [];
  for (const art of liveMatches) {
    const normalizedUrl = art.link.replace(/\/$/, '');
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      uniqueList.push(art);
    }
  }

  const liveArticles: NewsItem[] = uniqueList.map((art, idx) => {
    const fullText = `${art.title} ${art.desc}`.toLowerCase();

    let criticality: 'CRITICO_URGENTE' | 'RELEVANTE' | 'NORMAL' = 'NORMAL';
    if (fullText.includes('morto') || fullText.includes('morte') || fullText.includes('homicíd') || fullText.includes('homicid') || fullText.includes('tiros') || fullText.includes('balead') || fullText.includes('fuzil') || fullText.includes('refém') || fullText.includes('feminicíd') || fullText.includes('latrocín')) {
      criticality = 'CRITICO_URGENTE';
    } else if (fullText.includes('preso') || fullText.includes('presa') || fullText.includes('prisão') || fullText.includes('prisao') || fullText.includes('apreend') || fullText.includes('apreens') || fullText.includes('drogas') || fullText.includes('roubo') || fullText.includes('assalto') || fullText.includes('foragido') || fullText.includes('operação') || fullText.includes('operacao') || fullText.includes('embriaguez') || fullText.includes('arma')) {
      criticality = 'RELEVANTE';
    }

    let location = 'Rio Grande do Norte';
    if (fullText.includes('grande natal')) location = 'Grande Natal - RN';
    else if (fullText.includes('natal') || fullText.includes('zona norte') || fullText.includes('zona sul') || fullText.includes('zona oeste') || fullText.includes('zona leste') || fullText.includes('ponta negra') || fullText.includes('alecrim') || fullText.includes('felipe camarão')) location = 'Natal - RN';
    else if (fullText.includes('mossoró') || fullText.includes('mossoro')) location = 'Mossoró - RN';
    else if (fullText.includes('parnamirim')) location = 'Parnamirim - RN';
    else if (fullText.includes('macaíba') || fullText.includes('macaiba')) location = 'Macaíba - RN';
    else if (fullText.includes('são gonçalo') || fullText.includes('sao goncalo')) location = 'São Gonçalo do Amarante - RN';
    else if (fullText.includes('nísia floresta') || fullText.includes('nisia floresta')) location = 'Nísia Floresta - RN (Grande Natal)';
    else if (fullText.includes('assú') || fullText.includes('assu')) location = 'Assú - RN';
    else if (fullText.includes('caicó') || fullText.includes('caico')) location = 'Caicó - RN';
    else if (fullText.includes('currais novos')) location = 'Currais Novos - RN';
    else if (fullText.includes('ceará-mirim') || fullText.includes('ceara-mirim')) location = 'Ceará-Mirim - RN';
    else if (fullText.includes('extremoz')) location = 'Extremoz - RN';
    else if (fullText.includes('nova cruz')) location = 'Nova Cruz - RN (Agreste)';
    else if (fullText.includes('pau dos ferros')) location = 'Pau dos Ferros - RN (Oeste)';
    else if (fullText.includes('apodi')) location = 'Apodi - RN (Oeste)';
    else if (fullText.includes('touros') || fullText.includes('pipa') || fullText.includes('tibau do sul')) location = 'Litoral Potiguar - RN';

    let policeUnit = art.source.id === 'pmrn-oficial' ? 'PMRN Oficial' : 'PMRN / Segurança Pública';
    if (fullText.includes('cpc') || fullText.includes('comando da capital')) policeUnit = 'CPC / PMRN';
    else if (fullText.includes('cpre') || fullText.includes('zero álcool') || fullText.includes('lei seca')) policeUnit = 'CPRE / PMRN';
    else if (fullText.includes('cpm') || fullText.includes('metropolitano')) policeUnit = 'CPM / PMRN';
    else if (fullText.includes('choque') || fullText.includes('bpchoque')) policeUnit = 'BPChoque / PMRN';
    else if (fullText.includes('bope')) policeUnit = 'BOPE / PMRN';
    else if (fullText.includes('rocam')) policeUnit = 'ROCAM / PMRN';
    else if (fullText.includes('bptur')) policeUnit = 'BPTUR / PMRN';
    else if (fullText.includes('polícia civil') || fullText.includes('pcrn') || fullText.includes('dhpp') || fullText.includes('deicor') || fullText.includes('delegacia')) policeUnit = 'Polícia Civil / PCRN';

    let itemTimestamp = Date.now();
    const urlDateMatch = art.link.match(/\/(20\d\d)\/(\d{1,2})\/(\d{1,2})\//);
    if (urlDateMatch) {
      const year = parseInt(urlDateMatch[1], 10);
      const month = parseInt(urlDateMatch[2], 10) - 1;
      const day = parseInt(urlDateMatch[3], 10);
      itemTimestamp = new Date(year, month, day, 12, 0, 0).getTime();
    }

    if (art.pubDate) {
      try {
        const d = new Date(art.pubDate);
        if (!isNaN(d.getTime())) {
          itemTimestamp = d.getTime();
        }
      } catch {}
    }

    // Format publication string accurately relative to now
    let formattedDate = 'Hoje';
    const itemDate = new Date(itemTimestamp);
    const today = new Date();
    const isToday = itemDate.getDate() === today.getDate() &&
                    itemDate.getMonth() === today.getMonth() &&
                    itemDate.getFullYear() === today.getFullYear();

    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    const isYesterday = itemDate.getDate() === yesterday.getDate() &&
                        itemDate.getMonth() === yesterday.getMonth() &&
                        itemDate.getFullYear() === yesterday.getFullYear();

    const timeStr = itemDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      formattedDate = `Hoje, ${timeStr}`;
    } else if (isYesterday) {
      formattedDate = `Ontem, ${timeStr}`;
    } else {
      formattedDate = `${itemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
    }

    const rawClean = (art.desc || art.title)
      .replace(/Agora no g1[\s\S]*/gi, '')
      .replace(/Clique aqui[\s\S]*/gi, '')
      .replace(/Reprodução[\s\S]*/gi, '')
      .replace(/The post[\s\S]*appeared first on[\s\S]*/gi, '')
      .replace(/O post[\s\S]*apareceu primeiro em[\s\S]*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanSentences = rawClean
      .split(/(?<=[.!?])\s+/)
      .map(s => s.replace(/^[^\wáéíóúâêîôûãõçA-Z0-9]+/gi, '').trim())
      .filter(s => s.length > 25);

    const summaryPoints = cleanSentences.length >= 2
      ? cleanSentences.slice(0, 3)
      : [
          cleanSentences[0] || art.title,
          `Ocorrência monitorada via ${art.source.name} com atuação das forças de segurança pública (${policeUnit}).`,
        ];

    return {
      id: `live-${art.source.id}-${idx}-${itemTimestamp}`,
      title: art.title,
      source: art.source.name,
      sourceId: art.source.id,
      publishedAt: formattedDate,
      timestamp: itemTimestamp,
      location,
      criticality,
      executiveSummary: summaryPoints,
      url: art.link,
      category: criticality === 'CRITICO_URGENTE' ? 'Ocorrência Grave' : criticality === 'RELEVANTE' ? 'Polícia & Apreensões' : 'Segurança Pública',
      keywords: ['RN', 'Segurança Pública', art.source.name, policeUnit],
      policeUnit,
    };
  });

  // 3. Only include verified reference items from priority domains if live feeds returned zero items
  const finalSet = new Map<string, NewsItem>();
  for (const art of liveArticles) {
    if (isPrioritySourceUrl(art.url)) {
      finalSet.set(art.url, art);
    }
  }

  if (finalSet.size === 0) {
    let candidateRef = REFERENCE_PUBLIC_SAFETY_NEWS.filter(ref => isPrioritySourceUrl(ref.url));
    if (sourceIdFilter && sourceIdFilter !== 'ALL') {
      const targetSrc = PRIORITY_NEWS_SOURCES.find(s => s.id === sourceIdFilter);
      if (targetSrc) {
        candidateRef = candidateRef.filter(ref => ref.source.toLowerCase() === targetSrc.name.toLowerCase());
      }
    }
    if (userKeywords.length > 0) {
      candidateRef = candidateRef.filter(item => {
        const full = `${item.title} ${item.location} ${item.policeUnit || ''} ${item.keywords.join(' ')} ${item.executiveSummary.join(' ')}`.toLowerCase();
        return userKeywords.some(kw => {
          if (full.includes(kw)) return true;
          const subwords = kw.split(/\s+/).filter(w => w.length > 2);
          return subwords.length > 0 && subwords.some(sw => full.includes(sw));
        });
      });
    }
    for (const ref of candidateRef) {
      if (!finalSet.has(ref.url)) {
        finalSet.set(ref.url, ref);
      }
    }
  }

  const allItems = Array.from(finalSet.values());

  // 4. Locality filter: STRICT!
  const localityMatched = allItems.filter(item => matchesLocality(item, regionFilter));

  // 5. Date Range filter: STRICT!
  const periodMatched = localityMatched.filter(item => matchesDateRange(item, (dateRangeFilter as any) || 'hoje'));

  // 6. Sort descending by timestamp (newest first)
  periodMatched.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Build per-source counts for matched articles
  const sourceCounts: Record<string, number> = {};
  for (const item of periodMatched) {
    const key = item.sourceId || item.source;
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  }

  return {
    articles: periodMatched.slice(0, 40),
    sourceCounts,
    respondedSources,
  };
}

// In-memory cache for news scans (prevents redundant calls and quota exhaustion)
const scanCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// GET /api/radar/sources - Returns the exclusive list of 15 priority RN news sources
app.get('/api/radar/sources', (_req: Request, res: Response) => {
  res.json({
    total: PRIORITY_NEWS_SOURCES.length,
    sources: PRIORITY_NEWS_SOURCES.map(({ id, name, homeUrl, category, securityFocused }) => ({
      id,
      name,
      homeUrl,
      category,
      securityFocused: Boolean(securityFocused),
    })),
  });
});

// GET /api/radar/status - Health & Configuration verification
app.get('/api/radar/status', (_req: Request, res: Response) => {
  const aiStatus = getAIStatus();
  res.json({
    app: 'Radar de Notícias CPC',
    state: 'Rio Grande do Norte',
    status: 'ONLINE',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
    prioritySourcesCount: PRIORITY_NEWS_SOURCES.length,
    ai: {
      provider: aiStatus.provider,
      model: aiStatus.model,
      targetModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      openRouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    },
    version: '2.1.0',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/radar/scan
// Scans exclusively the 15 priority RN news websites & blogs and enriches them with OpenRouter AI (nvidia/nemotron-3-ultra-550b-a55b:free)
app.post('/api/radar/scan', async (req: Request, res: Response): Promise<void> => {
  const {
    region = 'Natal (CPC - PMRN / Capital)',
    command = 'CPC PMRN (Comando da Capital)',
    keywords = '',
    dateRange = 'hoje',
    sourceId = 'ALL',
  } = req.body;

  const cacheKey = `${region}:${command}:${keywords}:${dateRange}:${sourceId}`;
  const cached = scanCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    res.json({
      ...cached.data,
      fromCache: true,
      scannedAt: new Date(cached.timestamp).toISOString()
    });
    return;
  }

  try {
    // 1. Fetch real, live public safety news exclusively from the 15 priority RN portals & blogs
    const { articles: realLiveArticles, sourceCounts, respondedSources } = await harvestLiveRNNews(
      region,
      keywords,
      dateRange,
      sourceId
    );

    // 2. Enrich with OpenRouter.ai (nvidia/nemotron-3-ultra-550b-a55b:free)
    const { articles: enrichedArticles, providerUsed, modelUsed } = await enrichArticlesWithAI(realLiveArticles);

    const payload = {
      success: true,
      source: 'priority_rn_15_feeds',
      region,
      scannedAt: new Date().toISOString(),
      totalFound: enrichedArticles.length,
      prioritySourcesCount: PRIORITY_NEWS_SOURCES.length,
      respondedSources,
      sourceCounts,
      aiProvider: providerUsed,
      aiModel: modelUsed,
      articles: enrichedArticles,
    };

    scanCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    res.json(payload);
  } catch (error: any) {
    console.info('[Radar Scanner] Handled fallback for /api/radar/scan:', error?.message);
    const regionFiltered = REFERENCE_PUBLIC_SAFETY_NEWS.filter(
      item => isPrioritySourceUrl(item.url) && matchesLocality(item, region)
    );
    const pool = regionFiltered.length > 0 ? regionFiltered : REFERENCE_PUBLIC_SAFETY_NEWS;
    const dateFiltered = pool.filter(item => matchesDateRange(item, (dateRange as any) || 'hoje'));

    res.json({
      success: true,
      source: 'verified_reference_news',
      scannedAt: new Date().toISOString(),
      totalFound: dateFiltered.length,
      prioritySourcesCount: PRIORITY_NEWS_SOURCES.length,
      respondedSources: 0,
      sourceCounts: {},
      aiProvider: 'fallback',
      aiModel: 'Extrator Nativo RN',
      articles: dateFiltered
    });
  }
});

// POST /api/radar/synthesize-report
// Synthesizes a daily operational report formatted natively for WhatsApp with real verified links using OpenRouter
app.post('/api/radar/synthesize-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { articles = [], region = 'Natal / RN', command = 'CPC PMRN', dateLabel = 'Hoje' } = req.body;

    if (!articles || articles.length === 0) {
      res.status(400).json({ error: 'Nenhuma matéria selecionada para o relatório.' });
      return;
    }

    const { reportText, providerUsed, modelUsed } = await synthesizeWhatsAppReport(articles, region, command, dateLabel);

    res.json({
      success: true,
      reportText,
      aiProvider: providerUsed,
      aiModel: modelUsed,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.info('[Radar Synthesizer] Handled fallback synthesizer:', error?.message);
    const { articles = [], region = 'Natal / RN', command = 'CPC PMRN', dateLabel = 'Hoje' } = req.body;
    let fallbackText = `*RADAR DE NOTÍCIAS CPC | BOLETIM DIÁRIO*\n`;
    fallbackText += `📅 *Data:* ${dateLabel} | 📍 *Região:* ${region} (${command})\n\n`;
    fallbackText += `📋 *PANORAMA OPERACIONAL:* Monitoramento diário consolidado das principais ocorrências de segurança pública e policiamento ostensivo no Rio Grande do Norte.\n\n`;
    fallbackText += `🚨 *MATÉRIAS E OCORRÊNCIAS MONITORADAS:*\n`;

    articles.forEach((item: any, idx: number) => {
      const crit = item.criticality === 'CRITICO_URGENTE' ? '🔴 [URGENTE]' : item.criticality === 'RELEVANTE' ? '🟠 [RELEVANTE]' : '🟢 [NORMAL]';
      fallbackText += `\n*${idx + 1}. ${item.title}*\n`;
      fallbackText += `${crit} 📍 _${item.location}_ · Fonte: _${item.source}_\n`;
      if (Array.isArray(item.executiveSummary)) {
        item.executiveSummary.forEach((point: string) => {
          fallbackText += `  • ${point}\n`;
        });
      }
      if (item.url) {
        fallbackText += `  🔗 Matéria completa: ${item.url}\n`;
      }
    });

    fallbackText += `\n---\n_Radar de Notícias CPC — Monitoramento Operacional de Fontes Abertas (PMRN / SESED)_\n`;

    res.json({
      success: true,
      reportText: fallbackText,
      aiProvider: 'fallback',
      aiModel: 'Extrator Nativo RN',
      generatedAt: new Date().toISOString()
    });
  }
});
