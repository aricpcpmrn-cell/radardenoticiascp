export interface PriorityNewsSource {
  id: string;
  name: string;
  homeUrl: string;
  hostname: string;
  feedUrl: string;
  mode: 'rss' | 'html';
  category: 'portal' | 'blog' | 'oficial' | 'radio';
  /** Official police / crime-dedicated sources whose posts are inherently security-related */
  securityFocused?: boolean;
}

/**
 * Lista exclusiva de 15 sites e blogs prioritários do Rio Grande do Norte
 * monitorados pelo Radar de Notícias CPC.
 */
export const PRIORITY_NEWS_SOURCES: PriorityNewsSource[] = [
  {
    id: 'g1-rn',
    name: 'G1 RN',
    homeUrl: 'https://g1.globo.com/rn/rio-grande-do-norte/',
    hostname: 'g1.globo.com',
    feedUrl: 'https://g1.globo.com/dynamo/rn/rio-grande-do-norte/rss2.xml',
    mode: 'rss',
    category: 'portal',
  },
  {
    id: 'pmrn-oficial',
    name: 'PMRN Oficial',
    homeUrl: 'https://pmrnoficial.blogspot.com/',
    hostname: 'pmrnoficial.blogspot.com',
    feedUrl: 'https://pmrnoficial.blogspot.com/feeds/posts/default?alt=rss',
    mode: 'rss',
    category: 'oficial',
    securityFocused: true,
  },
  {
    id: 'portal-bo',
    name: 'Portal BO',
    homeUrl: 'https://portalbo.com/',
    hostname: 'portalbo.com',
    feedUrl: 'https://portalbo.com/feed/',
    mode: 'rss',
    category: 'portal',
    securityFocused: true,
  },
  {
    id: 'blog-do-bg',
    name: 'Blog do BG',
    homeUrl: 'https://www.blogdobg.com.br/',
    hostname: 'blogdobg.com.br',
    feedUrl: 'https://www.blogdobg.com.br/feed/',
    mode: 'rss',
    category: 'blog',
  },
  {
    id: 'blog-do-barreto',
    name: 'Blog do Barreto',
    homeUrl: 'https://blogdobarreto.com.br/',
    hostname: 'blogdobarreto.com.br',
    feedUrl: 'https://blogdobarreto.com.br/feed/',
    mode: 'rss',
    category: 'blog',
  },
  {
    id: 'robson-pires-xerife',
    name: 'Robson Pires Xerife',
    homeUrl: 'https://robsonpiresxerife.com/',
    hostname: 'robsonpiresxerife.com',
    feedUrl: 'https://robsonpiresxerife.com/feed/',
    mode: 'rss',
    category: 'blog',
  },
  {
    id: 'gustavo-negreiros',
    name: 'Gustavo Negreiros',
    homeUrl: 'https://gustavonegreiros.com.br/',
    hostname: 'gustavonegreiros.com.br',
    feedUrl: 'https://gustavonegreiros.com.br/feed/',
    mode: 'rss',
    category: 'blog',
  },
  {
    id: 'portal-da-tropical',
    name: 'Portal da Tropical',
    homeUrl: 'https://portaldatropical.com.br/',
    hostname: 'portaldatropical.com.br',
    feedUrl: 'https://portaldatropical.com.br/feed/',
    mode: 'rss',
    category: 'portal',
  },
  {
    id: '96fm-natal',
    name: '96 FM Natal',
    homeUrl: 'https://www.96fm.com.br/',
    hostname: '96fm.com.br',
    feedUrl: 'https://www.96fm.com.br/feed/',
    mode: 'rss',
    category: 'radio',
  },
  {
    id: 'via-certa-natal',
    name: 'Via Certa Natal',
    homeUrl: 'https://www.viacertanatal.com.br/',
    hostname: 'viacertanatal.com.br',
    feedUrl: 'https://www.viacertanatal.com.br/feeds/posts/default?alt=rss',
    mode: 'rss',
    category: 'portal',
  },
  {
    id: 'ponta-negra-news',
    name: 'Ponta Negra News',
    homeUrl: 'https://pontanegranews.com.br/',
    hostname: 'pontanegranews.com.br',
    feedUrl: 'https://pontanegranews.com.br/feed/',
    mode: 'rss',
    category: 'portal',
  },
  {
    id: 'blog-do-dina',
    name: 'Blog do Dina',
    homeUrl: 'https://blogdodina.com/',
    hostname: 'blogdodina.com',
    feedUrl: 'https://blogdodina.com/feed/',
    mode: 'rss',
    category: 'blog',
  },
  {
    id: 'agora-rn',
    name: 'Agora RN',
    homeUrl: 'https://agorarn.com.br/',
    hostname: 'agorarn.com.br',
    feedUrl: 'https://agorarn.com.br/feed/',
    mode: 'rss',
    category: 'portal',
  },
  {
    id: 'thalita-moema',
    name: 'Thalita Moema',
    homeUrl: 'https://www.thalitamoema.com.br/',
    hostname: 'thalitamoema.com.br',
    feedUrl: 'https://www.thalitamoema.com.br/rss.xml',
    mode: 'rss',
    category: 'blog',
  },
  {
    id: 'thaisa-galvao',
    name: 'Thaisa Galvão',
    homeUrl: 'https://www.thaisagalvao.com.br/',
    hostname: 'thaisagalvao.com.br',
    feedUrl: 'https://www.thaisagalvao.com.br/',
    mode: 'html',
    category: 'blog',
  },
];

/**
 * Validates that a given article URL belongs exclusively to one of the 15 priority RN sources.
 */
export function isPrioritySourceUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return PRIORITY_NEWS_SOURCES.some(src => {
      const target = src.hostname.toLowerCase().replace(/^www\./, '');
      return host === target || host.endsWith(`.${target}`);
    });
  } catch {
    return false;
  }
}

export function getPrioritySourceById(id: string): PriorityNewsSource | undefined {
  return PRIORITY_NEWS_SOURCES.find(s => s.id === id);
}
