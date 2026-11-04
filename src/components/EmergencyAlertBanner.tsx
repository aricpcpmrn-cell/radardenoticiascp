import React from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, Share2, X, BellRing } from 'lucide-react';
import { NewsItem } from '../types/radar';

interface EmergencyAlertBannerProps {
  urgentArticles: NewsItem[];
  onDismiss: (id: string) => void;
  onSelectArticle: (article: NewsItem) => void;
  onFilterUrgent: () => void;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({
  urgentArticles,
  onDismiss,
  onSelectArticle,
  onFilterUrgent,
}) => {
  if (urgentArticles.length === 0) return null;

  const latestUrgent = urgentArticles[0];

  const shareUrgentToWhatsApp = (item: NewsItem) => {
    const text = `🚨 *ALERTA CRÍTICO CPC — SEGURANÇA PÚBLICA*\n\n` +
      `*Ocorrência:* ${item.title}\n` +
      `📍 *Localidade:* ${item.location}\n` +
      `🕒 *Horário/Data:* ${item.publishedAt}\n` +
      `🛡️ *Unidade:* ${item.policeUnit || 'Comando CPC'}\n\n` +
      `*Resumo Executivo:*\n${item.executiveSummary.map(s => `• ${s}`).join('\n')}\n\n` +
      `🔗 *Matéria Original:* ${item.url}\n\n` +
      `_Radar de Notícias CPC — Alerta Operacional_`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-red-950/40 border-b border-red-800/60 dark:border-red-900/80 px-4 py-3 text-red-100 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white shrink-0 shadow-sm animate-pulse">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block"></span>
                Menção Crítica em Tempo Real ({urgentArticles.length})
              </span>
              <span aria-hidden="true" className="text-red-700">·</span>
              <span className="text-xs text-red-200/80 font-mono-tabular">
                {latestUrgent.publishedAt}
              </span>
              <span aria-hidden="true" className="text-red-700">·</span>
              <span className="text-xs text-red-200/90 font-medium">
                {latestUrgent.location}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white line-clamp-1 mt-0.5">
              <a
                href={latestUrgent.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="hover:underline hover:text-red-100 cursor-pointer"
                title="Abrir matéria original do alerta"
              >
                {latestUrgent.title}
              </a>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <a
            href={latestUrgent.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-red-800 hover:bg-red-700 text-white rounded-md border border-red-600 transition-colors whitespace-nowrap shadow-xs"
            title="Abrir a matéria original no veículo de imprensa"
          >
            <span>Ler Matéria</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => shareUrgentToWhatsApp(latestUrgent)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-md transition-colors whitespace-nowrap shadow-sm"
            title="Compartilhar este alerta urgente no WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Alerta WhatsApp</span>
          </button>
          <button
            onClick={() => onDismiss(latestUrgent.id)}
            className="p-1 text-red-400 hover:text-white rounded hover:bg-red-900/50 transition-colors"
            title="Dispensar este alerta"
            aria-label="Dispensar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
