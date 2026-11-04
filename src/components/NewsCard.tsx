import React from 'react';
import { ExternalLink, Share2, CheckSquare, Square, Shield, AlertTriangle, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { NewsItem } from '../types/radar';

interface NewsCardProps {
  article: NewsItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onShareWhatsApp: (article: NewsItem) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  article,
  isSelected,
  onToggleSelect,
  onShareWhatsApp,
}) => {
  const isUrgent = article.criticality === 'CRITICO_URGENTE';
  const isRelevant = article.criticality === 'RELEVANTE';

  return (
    <article
      className={`rounded-xl border transition-all duration-200 p-5 ${
        isUrgent
          ? 'bg-red-950/15 dark:bg-red-950/20 border-red-300 dark:border-red-900/60 shadow-xs'
          : isRelevant
          ? 'bg-amber-950/5 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      {/* Top Header: Unboxed metadata line with typographic separators */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
        <div className="flex items-center gap-2 flex-wrap text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {article.source}
          </span>
          <span aria-hidden="true">·</span>
          <span>{article.location}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{article.publishedAt}</span>
          {article.policeUnit && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {article.policeUnit}
              </span>
            </>
          )}
        </div>

        {/* Criticality Label (unboxed with semantic color + icon) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isUrgent ? (
            <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>CRÍTICO / URGENTE</span>
            </span>
          ) : isRelevant ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>RELEVANTE</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              INFORMATIVO
            </span>
          )}
        </div>
      </div>

      {/* Main Title - Links directly to the article */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 leading-snug mb-3">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
          title="Clique para abrir e ler a matéria completa no veículo original"
        >
          {article.title}
        </a>
      </h3>

      {/* AI Executive Summary Block */}
      <div className="my-3.5 p-3.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Resumo Executivo (IA CPC)</span>
        </div>
        <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {article.executiveSummary.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-blue-500 dark:text-blue-400 shrink-0 select-none font-bold">
                •
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Footer: Keywords as unboxed text + Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Keywords */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Pautas:</span>
          {article.keywords.map((kw, i) => (
            <React.Fragment key={kw}>
              <span>{kw}</span>
              {i < article.keywords.length - 1 && <span aria-hidden="true">·</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* Include in Daily Report Toggle */}
          <button
            onClick={() => onToggleSelect(article.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              isSelected
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
            title={isSelected ? 'Remover do relatório' : 'Adicionar ao relatório diário'}
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isSelected ? 'No Boletim' : 'Add Boletim'}</span>
          </button>

          {/* Quick WhatsApp Share */}
          <button
            onClick={() => onShareWhatsApp(article)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-xs"
            title="Compartilhar matéria formatada no WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Original Article Link (Deep link exclusively to article) */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-md transition-colors shadow-2xs"
            title="Abrir matéria completa no portal original"
          >
            <span>Ler Matéria Completa</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
