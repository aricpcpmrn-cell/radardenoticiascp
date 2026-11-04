import React, { useState } from 'react';
import { Search, Filter, RefreshCw, Calendar, MapPin, Tag, ShieldCheck, AlertCircle, X, RotateCcw } from 'lucide-react';
import { FilterState, REGION_PRESETS, KEYWORD_PRESETS } from '../types/radar';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>, autoScan?: boolean) => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  totalResults: number;
  totalLoaded?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onTriggerScan,
  isScanning,
  totalResults,
  totalLoaded = 0,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customRegion, setCustomRegion] = useState('');

  const handlePresetSelect = (presetId: string) => {
    const selected = REGION_PRESETS.find(p => p.id === presetId);
    if (selected) {
      onFilterChange({
        region: selected.label,
        command: selected.commandName,
      }, true);
    }
  };

  const handleAddKeyword = (kw: string) => {
    const currentList = filters.keywords.split(',').map(s => s.trim()).filter(Boolean);
    if (!currentList.includes(kw)) {
      const updated = currentList.length > 0 ? `${filters.keywords}, ${kw}` : kw;
      onFilterChange({ keywords: updated }, true);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 transition-colors">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Main Row: Search Input + Region Quick Selector + Scan Button */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Real-time search in current results */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              placeholder="Pesquisar por título, ocorrência, envolvidos, viatura ou bairro..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick Region Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
            <select
              value={REGION_PRESETS.find(p => p.label === filters.region)?.id || 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowAdvanced(true);
                } else {
                  handlePresetSelect(e.target.value);
                }
              }}
              className="py-2 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-medium"
            >
              {REGION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Outra localidade...</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
            {(['hoje', '24h', '7d', '30d'] as const).map((range) => {
              const labelMap = { hoje: 'Hoje', '24h': '24 horas', '7d': '7 dias', '30d': 'Mês' };
              const active = filters.dateRange === range;
              return (
                <button
                  key={range}
                  onClick={() => onFilterChange({ dateRange: range })}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {labelMap[range]}
                </button>
              );
            })}
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all whitespace-nowrap ${
              isScanning ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Varrendo Fontes...' : 'Atualizar Radar'}</span>
          </button>
        </div>

        {/* Severity Segmented Filter + Advanced Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap mr-1">
              Criticidade:
            </span>
            {[
              { id: 'ALL', label: 'Todas as Matérias' },
              { id: 'CRITICO_URGENTE', label: 'Crítico / Urgente' },
              { id: 'RELEVANTE', label: 'Relevantes' },
              { id: 'NORMAL', label: 'Informativas' },
            ].map((crit) => {
              const active = filters.criticality === crit.id;
              return (
                <button
                  key={crit.id}
                  onClick={() => onFilterChange({ criticality: crit.id as any })}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? crit.id === 'CRITICO_URGENTE'
                        ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 font-semibold border border-red-300 dark:border-red-800'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {crit.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <strong className="font-mono-tabular text-slate-900 dark:text-slate-100">{totalResults}</strong> matérias
            </span>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <Filter className="w-3 h-3" />
              <span>{showAdvanced ? 'Menos filtros' : 'Palavras-chave e Local'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters: Custom Location & Specific Keywords */}
        {showAdvanced && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-3 animate-in fade-in duration-200">
            {/* Custom Location Input */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:w-28 shrink-0">
                Localidade Livre:
              </label>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  placeholder="Ex.: Zona Norte de Natal, Parnamirim, Mossoró, Caicó, Macaíba..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (customRegion.trim()) {
                      onFilterChange({
                        region: customRegion.trim(),
                        command: `Comando ${customRegion.trim()}`
                      }, true);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Aplicar Local
                </button>
              </div>
            </div>

            {/* Specific Keywords Input */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:w-28 shrink-0 pt-1">
                Palavras-Chave:
              </label>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filters.keywords}
                    onChange={(e) => onFilterChange({ keywords: e.target.value })}
                    placeholder="Filtrar matérias por termos (ex.: fuzil, tráfico, homicídio, prisão, CPC)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {filters.keywords && (
                    <button
                      onClick={() => onFilterChange({ keywords: '' })}
                      className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                    >
                      Limpar Termos
                    </button>
                  )}
                </div>
                {/* Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Sugestões táticas:</span>
                  {KEYWORD_PRESETS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => handleAddKeyword(kw)}
                      className="text-[11px] px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      + {kw}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary Strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">Filtros ativos:</span>

            {/* Locality badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-medium">
              <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>{filters.region}</span>
              {!filters.region.includes('Geral') && (
                <button
                  onClick={() => onFilterChange({ region: REGION_PRESETS[2].label, command: REGION_PRESETS[2].commandName }, true)}
                  title="Ver todo o RN"
                  className="hover:text-blue-950 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>

            {/* Date Range badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-medium">
              <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>
                {filters.dateRange === 'hoje'
                  ? 'Período: Hoje'
                  : filters.dateRange === '24h'
                  ? 'Período: Últimas 24h'
                  : filters.dateRange === '7d'
                  ? 'Período: Últimos 7 dias'
                  : 'Período: Últimos 30 dias'}
              </span>
            </span>

            {/* Keywords badge */}
            {filters.keywords && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-medium">
                <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="truncate max-w-[200px]">{filters.keywords}</span>
                <button
                  onClick={() => onFilterChange({ keywords: '' })}
                  title="Remover palavras-chave"
                  className="hover:text-amber-950 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Search query badge */}
            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-medium">
                <Search className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>&quot;{filters.searchQuery}&quot;</span>
                <button
                  onClick={() => onFilterChange({ searchQuery: '' })}
                  title="Limpar busca"
                  className="hover:text-emerald-950 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Reset button if any filter is modified */}
          {(filters.searchQuery || filters.keywords || !filters.region.includes('Geral') || filters.criticality !== 'ALL' || filters.dateRange !== 'hoje') && (
            <button
              onClick={() => onFilterChange({
                region: REGION_PRESETS[2].label,
                command: REGION_PRESETS[2].commandName,
                keywords: '',
                searchQuery: '',
                criticality: 'ALL',
                dateRange: '30d'
              }, true)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ver todas do RN</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
