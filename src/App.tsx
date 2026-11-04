import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { FilterBar } from './components/FilterBar';
import { NewsCard } from './components/NewsCard';
import { DailyReportModal } from './components/DailyReportModal';
import { IntelligenceOverview } from './components/IntelligenceOverview';
import { NewsItem, FilterState, REGION_PRESETS } from './types/radar';
import { playTacticalAlertChime } from './utils/audioAlert';
import { matchesLocality, matchesDateRange } from './utils/filterUtils';
import { Radio, ShieldAlert, Sparkles, AlertTriangle, ExternalLink, Inbox, RotateCcw } from 'lucide-react';

const STORAGE_KEY_ARTICLES = 'radar_cpc_articles_v6_police_rn';
const STORAGE_KEY_SELECTED = 'radar_cpc_selected_v6_police_rn';
const STORAGE_KEY_THEME = 'radar_cpc_theme';
const STORAGE_KEY_AUDIO = 'radar_cpc_audio_muted';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved !== null) return saved === 'true';
    }
    return true; // Default to dark tactical command look
  });

  // Audio alerts
  const [audioMuted, setAudioMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_AUDIO) === 'true';
    }
    return false;
  });

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    region: REGION_PRESETS[0].label,
    command: REGION_PRESETS[0].commandName,
    keywords: '', // Empty by default: monitors all RN police and crime occurrences
    dateRange: 'hoje',
    criticality: 'ALL',
    searchQuery: '',
  });

  // Data state
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Sync theme to <html> tag
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, String(darkMode));
  }, [darkMode]);

  // Sync audio preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUDIO, String(audioMuted));
  }, [audioMuted]);

  // Initial load: Load cache first to prevent redundant API calls and rate-limiting
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY_ARTICLES);
    let hasValidCache = false;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setArticles(parsed);
          setSelectedIds(new Set(parsed.map(p => p.id)));
          hasValidCache = true;
          setLastScanTime('Carregado');
        }
      } catch (e) {
        console.warn('Cache error:', e);
      }
    }
    // Only trigger live network scan if cache was completely empty
    if (!hasValidCache) {
      triggerScan();
    }
  }, []);

  // Save articles to cache
  useEffect(() => {
    if (articles.length > 0) {
      localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(articles));
    }
  }, [articles]);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const triggerScan = async (overrideFilters?: Partial<FilterState>) => {
    setIsScanning(true);
    const activeFilters = { ...filters, ...overrideFilters };
    try {
      const response = await fetch('/api/radar/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: activeFilters.region,
          command: activeFilters.command,
          keywords: activeFilters.keywords,
          dateRange: activeFilters.dateRange,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.articles && Array.isArray(data.articles)) {
          // Merge newly fetched articles into current pool to preserve cross-region browsing
          setArticles(prev => {
            const map = new Map<string, NewsItem>();
            for (const a of data.articles) {
              map.set(a.url, a);
            }
            for (const a of prev) {
              if (!map.has(a.url)) {
                map.set(a.url, a);
              }
            }
            return Array.from(map.values());
          });
          setSelectedIds(new Set(data.articles.map((a: NewsItem) => a.id)));
          setLastScanTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

          const urgentItems = data.articles.filter((a: NewsItem) => a.criticality === 'CRITICO_URGENTE');
          if (urgentItems.length > 0) {
            playTacticalAlertChime(audioMuted);
          }

          showToast(`Radar atualizado: ${data.articles.length} matérias para ${activeFilters.region}`);
        }
      }
    } catch (err) {
      console.warn('Scan notice:', err);
      showToast('Exibindo matérias da base de inteligência local.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterState>, autoScan: boolean = false) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      if (autoScan) {
        triggerScan(updated);
      }
      return updated;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredArticles.map(a => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleShareWhatsApp = (article: NewsItem) => {
    const text = `*RADAR DE NOTÍCIAS CPC | MATÉRIA POLICIAL*\n\n` +
      `*${article.title}*\n` +
      `📍 *Local:* ${article.location}\n` +
      `📰 *Fonte:* ${article.source} (${article.publishedAt})\n` +
      `🛡️ *Unidade:* ${article.policeUnit || 'Polícia / CPC'}\n\n` +
      `*Resumo Executivo (IA CPC):*\n` +
      `${article.executiveSummary.map(p => `• ${p}`).join('\n')}\n\n` +
      `🔗 *Acesse a matéria original:* ${article.url}\n\n` +
      `_Radar de Notícias CPC — Inteligência de Fontes Abertas_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSimulateUrgentAlert = () => {
    const simulatedItem: NewsItem = {
      id: `real-urgent-${Date.now()}`,
      title: 'Homem é morto a tiros e criança de 4 anos é baleada dentro de barbearia no RN',
      source: 'G1 RN',
      publishedAt: 'Hoje, 08:49',
      timestamp: Date.now(),
      location: 'Assú - RN (Região Oeste / Frutilândia)',
      criticality: 'CRITICO_URGENTE',
      executiveSummary: [
        'Barbeiro de 24 anos foi executado a tiros dentro de estabelecimento comercial.',
        'Criança de 4 anos que estava no local foi atingida e transferida ao Hospital Regional Tarcísio Maia em Mossoró.',
        'Dois criminosos chegaram ao local em uma motocicleta e fugiram logo após os disparos.',
        'Polícia Militar isolou a cena do crime e a Polícia Civil apura a autoria e motivação.'
      ],
      url: 'https://g1.globo.com/rn/rio-grande-do-norte/noticia/2026/11/04/homem-e-morto-a-tiros-e-crianca-de-4-anos-e-baleada-dentro-de-barbearia-no-rn.ghtml',
      category: 'Ocorrência Grave / Homicídio',
      keywords: ['homicídio', 'tiros', 'PMRN', 'Assú', 'urgente'],
      policeUnit: 'PMRN / 10º BPM / Polícia Civil'
    };

    setArticles(prev => [simulatedItem, ...prev]);
    setSelectedIds(prev => new Set([simulatedItem.id, ...prev]));
    playTacticalAlertChime(audioMuted);
    showToast('🚨 Alerta urgente simulado disparado com sucesso!');
  };

  // Filtered list based on search, locality, dateRange, criticality, and keywords
  const filteredArticles = useMemo(() => {
    // Parse keywords if specified
    const activeKeywords = filters.keywords && filters.keywords.trim()
      ? filters.keywords
          .split(/[,;]+/)
          .map(k => k.trim().toLowerCase())
          .filter(Boolean)
      : [];

    return articles.filter(item => {
      // 1. Criticality filter
      if (filters.criticality !== 'ALL' && item.criticality !== filters.criticality) {
        return false;
      }

      // 2. Locality filter (matches selected RN region or custom location)
      if (!matchesLocality(item, filters.region)) {
        return false;
      }

      // 3. Period / Date Range filter ('hoje', '24h', '7d', '30d')
      if (!matchesDateRange(item, filters.dateRange)) {
        return false;
      }

      const itemFullText = `${item.title} ${item.source} ${item.location} ${item.policeUnit || ''} ${item.category} ${item.executiveSummary.join(' ')} ${item.keywords.join(' ')}`.toLowerCase();

      // 4. Real-time text search query (instant text bar)
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        if (!itemFullText.includes(query)) {
          return false;
        }
      }

      // 5. Keywords filter: if user specified keywords, ensure the article matches
      if (activeKeywords.length > 0) {
        const matchesKeywords = activeKeywords.some(kw => {
          if (itemFullText.includes(kw) || item.keywords.some(k => k.toLowerCase().includes(kw))) {
            return true;
          }
          // Also check words within the phrase (e.g. "fuzil" in "Apreensão de Fuzil")
          const subwords = kw
            .split(/\s+/)
            .map(w => w.replace(/^[^\wáéíóúâêîôûãõç]+|[^\wáéíóúâêîôûãõç]+$/gi, ''))
            .filter(w => w.length > 2 && !['para', 'com', 'das', 'dos', 'uma', 'uns', 'que', 'rn'].includes(w));
          return subwords.length > 0 && subwords.some(sw => itemFullText.includes(sw));
        });

        if (!matchesKeywords) {
          return false;
        }
      }

      return true;
    });
  }, [articles, filters.criticality, filters.region, filters.dateRange, filters.searchQuery, filters.keywords]);

  // Urgent articles for top banner
  const activeUrgentArticles = useMemo(() => {
    return articles.filter(a => a.criticality === 'CRITICO_URGENTE' && !dismissedAlertIds.has(a.id));
  }, [articles, dismissedAlertIds]);

  const selectedArticlesList = useMemo(() => {
    return articles.filter(a => selectedIds.has(a.id));
  }, [articles, selectedIds]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-blue-400 dark:text-blue-600" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        selectedCount={selectedIds.size}
        criticalCount={activeUrgentArticles.length}
        isScanning={isScanning}
      />

      {/* Real-Time Critical Alert Banner */}
      <EmergencyAlertBanner
        urgentArticles={activeUrgentArticles}
        onDismiss={(id) => setDismissedAlertIds(prev => new Set([...prev, id]))}
        onSelectArticle={(art) => {
          setFilters(prev => ({ ...prev, searchQuery: art.title.slice(0, 20) }));
        }}
        onFilterUrgent={() => {
          setFilters(prev => ({ ...prev, criticality: 'CRITICO_URGENTE' }));
        }}
      />

      {/* Interactive Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onTriggerScan={() => triggerScan()}
        isScanning={isScanning}
        totalResults={filteredArticles.length}
        totalLoaded={articles.length}
      />

      {/* Main Command Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tactical Intelligence Metrics Strip */}
        <IntelligenceOverview
          articles={articles}
          selectedCount={selectedIds.size}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onSimulateUrgentAlert={handleSimulateUrgentAlert}
        />

        {/* Status / Last Updated Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 px-1">
          <div>
            <span>Foco Operacional:</span>{' '}
            <strong className="text-slate-700 dark:text-slate-200">{filters.region}</strong>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Comando:</span>{' '}
            <strong className="text-slate-700 dark:text-slate-200">{filters.command}</strong>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Período:</span>{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {filters.dateRange === 'hoje' ? 'Hoje' : filters.dateRange === '24h' ? 'Últimas 24h' : filters.dateRange === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
            </strong>
          </div>
          {lastScanTime && (
            <div>
              <span>Última varredura às</span>{' '}
              <strong className="font-mono-tabular text-slate-700 dark:text-slate-200">{lastScanTime}</strong>
            </div>
          )}
        </div>

        {/* Feed List */}
        {isScanning && articles.length === 0 ? (
          // Loading Skeleton
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-16 bg-slate-100 dark:bg-slate-950 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          // Empty State
          <div className="py-16 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 p-8">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Nenhuma matéria encontrada para {filters.region} ({filters.dateRange === 'hoje' ? 'Hoje' : filters.dateRange === '24h' ? '24 horas' : filters.dateRange === '7d' ? '7 dias' : '30 dias'})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              Você pode expandir o período temporal, alternar para Todo o RN ou executar uma nova varredura ao vivo nas fontes abertas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handleFilterChange({
                  region: REGION_PRESETS[2].label,
                  command: REGION_PRESETS[2].commandName,
                  dateRange: '30d',
                  criticality: 'ALL',
                  searchQuery: '',
                  keywords: ''
                }, true)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-md text-slate-800 dark:text-slate-200 transition-colors"
              >
                Ver Todo o RN (30 dias)
              </button>
              {filters.dateRange !== '30d' && (
                <button
                  onClick={() => handleFilterChange({ dateRange: '30d' })}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-800 dark:text-slate-200 transition-colors"
                >
                  Expandir Período (30 dias)
                </button>
              )}
              <button
                onClick={() => triggerScan()}
                className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Varredura ao Vivo
              </button>
            </div>
          </div>
        ) : (
          // News Articles Feed
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                isSelected={selectedIds.has(article.id)}
                onToggleSelect={handleToggleSelect}
                onShareWhatsApp={handleShareWhatsApp}
              />
            ))}
          </div>
        )}
      </main>

      {/* Daily Report WhatsApp Modal */}
      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        selectedArticles={selectedArticlesList}
        region={filters.region}
        command={filters.command}
      />

      {/* Institutional Minimalist Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Radar de Notícias CPC
            </span>
            <span aria-hidden="true">·</span>
            <span>Inteligência Operacional em Fontes Abertas (OSINT)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Deploy Serverless (Vercel / Cloud Run)</span>
            <span aria-hidden="true">·</span>
            <span>Custo Zero de Banco de Dados</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
