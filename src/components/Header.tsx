import React from 'react';
import { BotConfig, BotInfo } from '../types';
import { ShieldCheck, ShieldAlert, Radio, Activity, RefreshCw, Send, Terminal } from 'lucide-react';

interface HeaderProps {
  config: BotConfig | null;
  botInfo: BotInfo | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenSimulate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  botInfo,
  activeTab,
  setActiveTab,
  onRefresh,
  isLoading,
  onOpenSimulate,
}) => {
  const isOnline = Boolean(config?.isConfigured);
  const botUsername = botInfo?.username ? `@${botInfo.username}` : null;

  return (
    <header id="app-header" className="bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 font-bold text-lg">
              TG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-neutral-100 leading-none">
                  Telegram Forwarder Server
                </h1>
                {botUsername && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-800/60 text-sky-400 font-mono">
                    {botUsername}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Сервер пересылки и сохранения истории сообщений из групп
              </p>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              id="header-refresh-btn-mobile"
              onClick={onRefresh}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav id="header-nav-tabs" className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            id="tab-monitor"
            onClick={() => setActiveTab('monitor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'monitor'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Монитор сообщений
          </button>

          <button
            id="tab-config"
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Настройка бота
          </button>

          <button
            id="tab-inspector"
            onClick={() => setActiveTab('inspector')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'inspector'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Инспектор Webhook
          </button>

          <button
            id="tab-export"
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Код для Vercel
          </button>

          <button
            id="tab-logs"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70'
            }`}
          >
            Журнал сервера
          </button>
        </nav>

        {/* Right Status Actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline
                  ? config?.mode === 'polling'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-neutral-300 font-medium">
              {isOnline
                ? config?.mode === 'polling'
                  ? 'Polling активен'
                  : 'Webhook активен'
                : 'Требуется токен'}
            </span>
          </div>

          <button
            id="btn-simulate-modal-open"
            onClick={onOpenSimulate}
            className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" />
            Тест симуляции
          </button>

          <button
            id="header-refresh-btn-desktop"
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
