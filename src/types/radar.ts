export type CriticalityLevel = 'CRITICO_URGENTE' | 'RELEVANTE' | 'NORMAL';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  timestamp?: number;
  location: string;
  criticality: CriticalityLevel;
  executiveSummary: string[];
  url: string;
  category: string;
  keywords: string[];
  policeUnit?: string;
  bookmarked?: boolean;
  read?: boolean;
}

export interface RegionPreset {
  id: string;
  label: string;
  commandName: string;
  state: string;
  city: string;
}

export const REGION_PRESETS: RegionPreset[] = [
  { id: 'rn-cpc-natal', label: 'Natal (CPC - PMRN / Capital)', commandName: 'CPC PMRN (Comando da Capital)', state: 'RN', city: 'Natal' },
  { id: 'rn-metropolitana', label: 'Grande Natal (Parnamirim, Macaíba, SGA, Ceará-Mirim)', commandName: 'CPM / CPC PMRN', state: 'RN', city: 'Região Metropolitana de Natal' },
  { id: 'rn-geral', label: 'Rio Grande do Norte (Geral / SESED)', commandName: 'PMRN / PCRN / SESED-RN', state: 'RN', city: 'Todo o RN' },
  { id: 'rn-oeste-mossoro', label: 'Mossoró e Região Oeste (CPR II)', commandName: '2º BPM / 12º BPM / CPR II', state: 'RN', city: 'Mossoró' },
  { id: 'rn-serido-caico', label: 'Caicó e Seridó (CPR III)', commandName: '6º BPM / CPR III PMRN', state: 'RN', city: 'Caicó' },
  { id: 'rn-agreste', label: 'Agreste Potiguar (CPR IV / 8º BPM)', commandName: '8º BPM / CPR IV PMRN', state: 'RN', city: 'Agreste Potiguar' },
  { id: 'rn-litoral-turismo', label: 'Litoral Potiguar (BPTUR / CPR I)', commandName: 'BPTUR / CPR I PMRN', state: 'RN', city: 'Litoral Norte e Sul' },
  { id: 'rn-especializadas', label: 'Tropas Especializadas RN (BPChoque, BOPE, ROCAM)', commandName: 'Comando de Policiamento Especializado RN', state: 'RN', city: 'Natal e RN' },
];

export const KEYWORD_PRESETS: string[] = [
  'Apreensão de Fuzil e Armas',
  'Tráfico de Drogas',
  'Operação Integrada SESED',
  'CPC PMRN',
  'BPChoque / BOPE RN',
  'DHPP e Homicídios',
  'Cerco Tático e Bloqueio',
  'Foragido do Sistema Prisional',
  'ROCAM / Motopatrulhamento',
  'Segurança Pública RN'
];

export interface FilterState {
  region: string;
  command: string;
  keywords: string;
  dateRange: 'hoje' | '24h' | '7d' | '30d';
  criticality: 'ALL' | 'CRITICO_URGENTE' | 'RELEVANTE' | 'NORMAL';
  searchQuery: string;
}

export interface DailyReportState {
  id: string;
  date: string;
  region: string;
  articlesCount: number;
  reportContent: string;
  generatedAt: string;
}
