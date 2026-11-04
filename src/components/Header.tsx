import React from 'react';
import { Radio, Volume2, VolumeX, Moon, Sun, FileSpreadsheet, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  audioMuted: boolean;
  setAudioMuted: (value: boolean | ((prev: boolean) => boolean)) => void;
  onOpenReportModal: () => void;
  selectedCount: number;
  criticalCount: number;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  audioMuted,
  setAudioMuted,
  onOpenReportModal,
  selectedCount,
  criticalCount,
  isScanning,
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand title & Tactical Radar Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-blue-900/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shadow-sm">
            <Radio className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Radar de Notícias CPC
              </span>
              <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                RN
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Inteligência e Segurança Pública · Rio Grande do Norte
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links & Tactical Status */}
        <nav className="hidden lg:flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Varredura Contínua</span>
          </div>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <div>
            <span>Alertas Urgentes:</span>{' '}
            <strong className={`font-mono-tabular ${criticalCount > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
              {criticalCount}
            </strong>
          </div>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <div>
            <span>Selecionadas p/ Boletim:</span>{' '}
            <strong className="font-mono-tabular text-blue-600 dark:text-blue-400 font-bold">
              {selectedCount}
            </strong>
          </div>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioMuted(prev => !prev)}
            title={audioMuted ? 'Ativar alerta sonoro de matérias urgentes' : 'Silenciar alerta sonoro'}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
            aria-label="Controle de áudio"
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
            aria-label="Alternar tema"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Primary Action Button: Daily Report */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg shadow-sm transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Gerar Relatório Diário</span>
            {selectedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-800 text-[10px] rounded-full font-mono-tabular">
                {selectedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
