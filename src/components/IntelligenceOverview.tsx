import React from 'react';
import { Shield, AlertTriangle, Radio, CheckSquare, Square, BellPlus, Sparkles } from 'lucide-react';
import { NewsItem } from '../types/radar';

interface IntelligenceOverviewProps {
  articles: NewsItem[];
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSimulateUrgentAlert: () => void;
}

export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({
  articles,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onSimulateUrgentAlert,
}) => {
  const criticalCount = articles.filter(a => a.criticality === 'CRITICO_URGENTE').length;
  const relevantCount = articles.filter(a => a.criticality === 'RELEVANTE').length;
  const normalCount = articles.filter(a => a.criticality === 'NORMAL').length;

  return (
    <div className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Metric Strip (Tabular Figures) */}
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Matérias Monitoradas
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
              {articles.length}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Crítico / Urgente
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono-tabular text-red-600 dark:text-red-400">
              {criticalCount}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Relevantes
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono-tabular text-amber-600 dark:text-amber-400">
              {relevantCount}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Informativas
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-700 dark:text-slate-300">
              {normalCount}
            </span>
          </div>
        </div>

        {/* Action Controls for Batch Operations */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          <button
            onClick={onSimulateUrgentAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors"
            title="Simular ocorrência crítica para testar alertas e áudio"
          >
            <BellPlus className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Testar Alerta Urgente</span>
          </button>

          {selectedCount < articles.length ? (
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-xs"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Selecionar Todas ({articles.length})</span>
            </button>
          ) : (
            <button
              onClick={onDeselectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-xs"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Desmarcar Todas</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
