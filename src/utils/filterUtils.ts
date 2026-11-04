/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsItem } from '../types/radar';

/**
 * Parses any article publication string or timestamp into epoch milliseconds.
 * Always checks for embedded publication dates in the URL first (e.g. /2026/11/04/ or /2017/04/17/)
 * to strictly prevent historical articles from masquerading as recent news.
 */
export function parseArticleTimestamp(item: NewsItem): number {
  // 1. Check URL for explicit publication date (e.g. /2026/11/04/ or /2017/04/17/)
  if (item.url) {
    const urlDateMatch = item.url.match(/\/(20\d\d)\/(\d{1,2})\/(\d{1,2})\//);
    if (urlDateMatch) {
      const year = parseInt(urlDateMatch[1], 10);
      const month = parseInt(urlDateMatch[2], 10) - 1;
      const day = parseInt(urlDateMatch[3], 10);
      const urlDate = new Date(year, month, day, 12, 0, 0);

      // If item has a specific hour/min timestamp on that exact same day, keep it
      if (typeof item.timestamp === 'number' && !isNaN(item.timestamp) && item.timestamp > 0) {
        const itemD = new Date(item.timestamp);
        if (itemD.getFullYear() === year && itemD.getMonth() === month && itemD.getDate() === day) {
          return item.timestamp;
        }
      }

      // If the URL has an older year (e.g. 2017), the URL date strictly rules!
      return urlDate.getTime();
    }
  }

  // 2. Direct numeric timestamp if valid
  if (typeof item.timestamp === 'number' && !isNaN(item.timestamp) && item.timestamp > 0) {
    return item.timestamp;
  }

  const str = (item.publishedAt || '').trim();
  const now = Date.now();
  if (!str) return now;

  // 3. Direct ISO or standard RFC822 / Date.parse (e.g. "Wed, 04 Nov 2026 13:06:55 -0000")
  const parsedDirect = Date.parse(str);
  if (!isNaN(parsedDirect)) {
    return parsedDirect;
  }

  const lower = str.toLowerCase();

  // 4. "Agora mesmo" or "Agora"
  if (lower.includes('agora')) {
    return now;
  }

  // 5. "Hoje, HH:MM" or "Hoje"
  if (lower.includes('hoje')) {
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    const d = new Date();
    if (timeMatch) {
      d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    }
    return d.getTime();
  }

  // 6. "Ontem, HH:MM" or "Ontem"
  if (lower.includes('ontem')) {
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    const d = new Date(now - 24 * 3600 * 1000);
    if (timeMatch) {
      d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    }
    return d.getTime();
  }

  // 7. "DD/MM às HH:MM" or "DD/MM/AAAA" or "DD/MM"
  const brMatch = str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s*(?:às|as|,)\s*(\d{1,2}):(\d{2}))?/i);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = brMatch[3] ? parseInt(brMatch[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 12;
    const minute = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const d = new Date(year, month, day, hour, minute);
    return d.getTime();
  }

  // Default fallback: 24h ago
  return now - 24 * 3600 * 1000;
}

/**
 * Checks if an article strictly matches the selected date period filter.
 * Prevents old news from past weeks or years from appearing in 'hoje' or '24h'.
 */
export function matchesDateRange(item: NewsItem, dateRange: 'hoje' | '24h' | '7d' | '30d'): boolean {
  const ts = parseArticleTimestamp(item);
  const now = Date.now();
  const diff = now - ts;

  if (dateRange === 'hoje') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Must be published today (>= today 00:00:00 local) and within the last 24h
    return ts >= today.getTime() && diff <= 24 * 3600 * 1000;
  }

  if (dateRange === '24h') {
    // Strictly in the last 24 hours
    return diff >= -3600 * 1000 && diff <= 24 * 3600 * 1000;
  }

  if (dateRange === '7d') {
    // Strictly in the last 7 days
    return diff >= -3600 * 1000 && diff <= 7 * 24 * 3600 * 1000;
  }

  if (dateRange === '30d') {
    // Strictly in the last 30 days
    return diff >= -3600 * 1000 && diff <= 30 * 24 * 3600 * 1000;
  }

  return true;
}

/**
 * Checks if an article matches the selected locality / operational region filter
 */
export function matchesLocality(item: NewsItem, selectedRegion: string): boolean {
  if (!selectedRegion) return true;

  // "Geral" or "Todo o RN" matches all RN public safety news
  if (
    selectedRegion.includes('Geral') ||
    selectedRegion.includes('Todo o RN') ||
    selectedRegion.includes('Rio Grande do Norte (Geral') ||
    selectedRegion === 'all'
  ) {
    return true;
  }

  const fullText = `${item.location} ${item.policeUnit || ''} ${item.title} ${item.category} ${item.executiveSummary.join(' ')}`.toLowerCase();

  // 1. Natal / CPC / Capital
  if (selectedRegion.includes('Natal (CPC') || selectedRegion.includes('Capital')) {
    const natalTerms = [
      'natal', 'cpc', 'capital', 'ponta negra', 'alecrim', 'tirol', 'petrópolis', 'petropolis',
      'felipe camarão', 'felipe camarao', 'zona norte', 'zona sul', 'zona leste', 'zona oeste',
      'potengi', 'redinha', 'candelária', 'candelaria', 'capim macio', 'neópolis', 'neopolis',
      'cidade alta', 'ribeira', 'mãe luíza', 'mae luiza', 'planalto', '1º bpm', '4º bpm', '5º bpm', '9º bpm',
      'comando da capital', 'dhpp natal', 'defur natal'
    ];
    return natalTerms.some(term => fullText.includes(term));
  }

  // 2. Grande Natal / Região Metropolitana
  if (selectedRegion.includes('Grande Natal') || selectedRegion.includes('Metropolitana')) {
    const metroTerms = [
      'grande natal', 'metropolitana', 'parnamirim', 'macaíba', 'macaiba',
      'são gonçalo', 'sao goncalo', 'sga', 'ceará-mirim', 'ceara-mirim', 'cearamirim',
      'extremoz', 'nísia floresta', 'nisia floresta', 'monte alegre', '3º bpm', '11º bpm', 'cpm'
    ];
    return metroTerms.some(term => fullText.includes(term));
  }

  // 3. Mossoró e Região Oeste (CPR II)
  if (selectedRegion.includes('Mossoró') || selectedRegion.includes('Mossoro') || selectedRegion.includes('Oeste')) {
    const oesteTerms = [
      'mossoró', 'mossoro', 'oeste', 'assú', 'assu', 'baraúna', 'barauna',
      'apodi', 'pau dos ferros', 'areia branca', 'grossos', 'tibau', 'cpr ii', '2º bpm', '12º bpm', '10º bpm'
    ];
    return oesteTerms.some(term => fullText.includes(term));
  }

  // 4. Caicó e Seridó (CPR III)
  if (selectedRegion.includes('Caicó') || selectedRegion.includes('Caico') || selectedRegion.includes('Seridó') || selectedRegion.includes('Serido')) {
    const seridoTerms = [
      'caicó', 'caico', 'seridó', 'serido', 'currais novos', 'jucurutu',
      'jardim de piranhas', 'parelhas', 'cruzeta', 'acari', '6º bpm', 'cpr iii'
    ];
    return seridoTerms.some(term => fullText.includes(term));
  }

  // 5. Agreste Potiguar (CPR IV)
  if (selectedRegion.includes('Agreste')) {
    const agresteTerms = [
      'agreste', 'nova cruz', 'goianinha', 'santo antônio', 'santo antonio',
      'passa e fica', 'canguaretama', '8º bpm', 'cpr iv'
    ];
    return agresteTerms.some(term => fullText.includes(term));
  }

  // 6. Litoral Potiguar (BPTUR / CPR I)
  if (selectedRegion.includes('Litoral') || selectedRegion.includes('Turismo')) {
    const litoralTerms = [
      'litoral', 'bptur', 'praia', 'pipa', 'tibau do sul', 'touros',
      'maracajaú', 'maracajau', 'pirangi', 'genipabu', 'cpr i'
    ];
    return litoralTerms.some(term => fullText.includes(term));
  }

  // 7. Tropas Especializadas (BPChoque, BOPE, ROCAM)
  if (selectedRegion.includes('Especializadas') || selectedRegion.includes('Choque') || selectedRegion.includes('BOPE')) {
    const especializadasTerms = [
      'choque', 'bpchoque', 'bope', 'rocam', 'cipam', 'ciopaer', 'cpe', 'especializada', 'cavalaria'
    ];
    return especializadasTerms.some(term => fullText.includes(term));
  }

  // 8. Custom / Free-text Locality
  const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const terms = normalize(selectedRegion)
    .split(/[\s,/\\-]+/)
    .filter(w => w.length > 2 && !['para', 'com', 'das', 'dos', 'uma', 'uns', 'que', 'rio', 'grande', 'norte', 'estado', 'regiao', 'comando'].includes(w));

  const normalizedFull = normalize(fullText);
  if (terms.length === 0) return true;
  return terms.some(t => normalizedFull.includes(t));
}
