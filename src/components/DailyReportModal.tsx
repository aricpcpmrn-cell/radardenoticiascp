import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Download, RefreshCw, Sparkles, MessageCircle, FileText } from 'lucide-react';
import { NewsItem } from '../types/radar';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArticles: NewsItem[];
  region: string;
  command: string;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  selectedArticles,
  region,
  command,
}) => {
  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'executive'>('whatsapp');

  // Build client-side fallback formatting instantly, and call Gemini backend for executive synthesis
  useEffect(() => {
    if (!isOpen || selectedArticles.length === 0) return;
    generateReport();
  }, [isOpen]);

  const generateReport = async () => {
    setIsGenerating(true);
    const todayStr = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    try {
      const response = await fetch('/api/radar/synthesize-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: selectedArticles,
          region,
          command,
          dateLabel: todayStr,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reportText) {
          setReportText(data.reportText);
          setIsGenerating(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend report synthesis failed, using local template engine:', err);
    }

    // High quality local formatter
    let built = `*RADAR DE NOTÍCIAS CPC | BOLETIM OPERACIONAL*\n`;
    built += `📅 *Data:* ${todayStr}\n`;
    built += `📍 *Região / Comando:* ${region} (${command})\n`;
    built += `📊 *Total de Matérias:* ${selectedArticles.length}\n\n`;

    const urgentList = selectedArticles.filter(a => a.criticality === 'CRITICO_URGENTE');
    if (urgentList.length > 0) {
      built += `🚨 *OCORRÊNCIAS CRÍTICAS E URGENTES (${urgentList.length}):*\n`;
      urgentList.forEach((item, idx) => {
        built += `\n*${idx + 1}. ${item.title}*\n`;
        built += `📍 _${item.location}_ · Fonte: _${item.source}_\n`;
        item.executiveSummary.forEach(p => {
          built += `  • ${p}\n`;
        });
        built += `  🔗 Link: ${item.url}\n`;
      });
      built += `\n─────────────────────\n\n`;
    }

    const otherList = selectedArticles.filter(a => a.criticality !== 'CRITICO_URGENTE');
    if (otherList.length > 0) {
      built += `📋 *DEMAIS OCORRÊNCIAS E OPERAÇÕES:*\n`;
      otherList.forEach((item, idx) => {
        const marker = item.criticality === 'RELEVANTE' ? '🟠' : '🟢';
        built += `\n*${marker} ${idx + 1}. ${item.title}*\n`;
        built += `📍 _${item.location}_ · Fonte: _${item.source}_\n`;
        item.executiveSummary.forEach(p => {
          built += `  • ${p}\n`;
        });
        built += `  🔗 Link: ${item.url}\n`;
      });
      built += `\n─────────────────────\n\n`;
    }

    built += `_Radar de Notícias CPC — Automatização e Inteligência Operacional_\n`;
    built += `_Gerado automaticamente sem custos de banco de dados._`;

    setReportText(built);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(reportText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boletim-radar-cpc-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Boletim Diário CPC — Compartilhamento WhatsApp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedArticles.length} matérias selecionadas · {region}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Formato WhatsApp:
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Pronto para envio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
              title="Regerar síntese com IA"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regerar IA</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
              title="Baixar arquivo de texto"
            >
              <Download className="w-3 h-3" />
              <span>Baixar .TXT</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isGenerating ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Compilando síntese executiva via OpenRouter (Nemotron 3 Ultra)...
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Modelo nvidia/nemotron-3-ultra-550b-a55b:free organizando ocorrências críticas, indicadores e links diretos do RN.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={14}
                  className="w-full p-4 text-xs sm:text-sm font-mono-tabular bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="Texto do boletim..."
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dica: O texto acima suporta formatação do WhatsApp (`*negrito*`, `_itálico_`). Você pode editar manualmente antes de enviar.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 rounded-b-xl flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Fechar
            </button>
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
              OpenRouter · nvidia/nemotron-3-ultra-550b-a55b:free
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar para WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
