/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BotConfig, ForwardedMessage, BotInfo, WebhookInfo, ServerLog } from './types';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { LiveMonitor } from './components/LiveMonitor';
import { BotConfigPanel } from './components/BotConfigPanel';
import { TelegramInspector } from './components/TelegramInspector';
import { VercelDeployFiles } from './components/VercelDeployFiles';
import { ServerLogsPanel } from './components/ServerLogsPanel';
import { SimulateModal } from './components/SimulateModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('monitor');
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [messages, setMessages] = useState<ForwardedMessage[]>([]);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [botError, setBotError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);

  // Toast notifications
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Safe JSON helper to prevent syntax errors if server returns non-JSON/HTML
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      // If server returned 200 OK (e.g. plain text "200" or HTML), treat as success or return structured info
      if (res.ok) {
        return { success: true, message: text || 'OK', isTextResponse: true };
      }
      throw new Error(text || `Сервер вернул статус ${res.status}`);
    }
    return res.json();
  };

  // Fetch Config
  const loadConfig = useCallback(async () => {
    try {
      const data: BotConfig = await safeFetchJson('/api/config');
      setConfig(data);
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  }, []);

  // Fetch Messages History
  const loadMessages = useCallback(async () => {
    try {
      const data = await safeFetchJson('/api/messages');
      setMessages(data.messages || []);
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  }, []);

  // Fetch Server Logs
  const loadLogs = useCallback(async () => {
    try {
      const data = await safeFetchJson('/api/logs');
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  }, []);

  // Fetch Telegram API Status
  const loadTelegramStatus = useCallback(async () => {
    try {
      const data = await safeFetchJson('/api/telegram/status');
      if (data.configured) {
        setBotInfo(data.bot || null);
        setWebhookInfo(data.webhook || null);
        setBotError(data.botError || null);
        setWebhookError(data.webhookError || null);
        setIsPolling(data.isPolling || false);
      } else {
        setBotInfo(null);
        setWebhookInfo(null);
      }
    } catch (e) {
      console.error('Error fetching Telegram status:', e);
    }
  }, []);

  // Refresh all
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadConfig(), loadMessages(), loadLogs(), loadTelegramStatus()]);
    setIsLoading(false);
  }, [loadConfig, loadMessages, loadLogs, loadTelegramStatus]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh interval (for messages & logs feed)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadMessages();
      loadLogs();
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMessages, loadLogs]);

  // Save Bot Config
  const handleSaveConfig = async (
    token: string,
    chatId: string,
    keywords?: string[],
    forwardAll?: boolean,
    notifyKeywords?: boolean
  ) => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          chatId,
          keywords,
          forwardAll,
          notifyKeywords,
        }),
      });
      if (data.success) {
        showToast('Настройки бота и ключевые слова успешно сохранены!', 'success');
        await refreshAll();
      } else {
        showToast(data.error || 'Ошибка сохранения настроек', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Set Webhook
  const handleSetWebhook = async (customUrl?: string) => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customUrl }),
      });
      if (data.success) {
        showToast(`Webhook успешно привязан: ${data.url}`, 'success');
        await refreshAll();
      } else {
        showToast(`Ошибка установки вебхука: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async () => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/telegram/delete-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dropPendingUpdates: true }),
      });
      if (data.success) {
        showToast('Webhook успешно удален из Telegram API', 'info');
        await refreshAll();
      } else {
        showToast(data.error || 'Ошибка удаления вебхука', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Polling
  const handleTogglePolling = async () => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/telegram/toggle-polling', {
        method: 'POST',
      });
      if (data.success) {
        showToast(
          data.isPolling ? 'Long Polling успешно запущен!' : 'Long Polling остановлен',
          'success'
        );
        await refreshAll();
      } else {
        showToast(data.error || 'Ошибка переключения режима', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Send Test Message
  const handleSendTestMessage = async () => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (data.success) {
        showToast('Тестовое сообщение отправлено в ваш Telegram ЛС!', 'success');
      } else {
        showToast(`Ошибка отправки: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate incoming group message
  const handleSimulate = async (groupTitle: string, senderName: string, text: string) => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/telegram/simulate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupTitle, senderName, text }),
      });
      if (data.success) {
        showToast('Симуляция выполнена! Сообщение добавлено в монитор', 'success');
        await loadMessages();
        await loadLogs();
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка симуляции', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear messages history
  const handleClearMessages = async () => {
    try {
      await fetch('/api/messages', { method: 'DELETE' });
      setMessages([]);
      showToast('История сообщений очищена', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Clear server logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
      showToast('Журнал сервера очищен', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-neutral-950 text-neutral-100 antialiased flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-800 text-rose-200'
                : 'bg-neutral-900/95 border-neutral-700 text-neutral-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        config={config}
        botInfo={botInfo}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={refreshAll}
        isLoading={isLoading}
        onOpenSimulate={() => setIsSimulateOpen(true)}
      />

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Metrics Overview Bar */}
        <StatsOverview
          messages={messages}
          webhookInfo={webhookInfo}
          botInfo={botInfo}
          mode={config?.mode || 'idle'}
        />

        {/* Tab 1: Live Monitor */}
        {activeTab === 'monitor' && (
          <LiveMonitor
            messages={messages}
            onClearMessages={handleClearMessages}
            onOpenSimulate={() => setIsSimulateOpen(true)}
            isConfigured={Boolean(config?.isConfigured)}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
          />
        )}

        {/* Tab 2: Bot Configuration */}
        {activeTab === 'config' && (
          <BotConfigPanel
            config={config}
            onSaveConfig={handleSaveConfig}
            onSetWebhook={handleSetWebhook}
            onDeleteWebhook={handleDeleteWebhook}
            onTogglePolling={handleTogglePolling}
            onSendTestMessage={handleSendTestMessage}
            isLoading={isLoading}
          />
        )}

        {/* Tab 3: Telegram Inspector */}
        {activeTab === 'inspector' && (
          <TelegramInspector
            botInfo={botInfo}
            webhookInfo={webhookInfo}
            botError={botError}
            webhookError={webhookError}
            isPolling={isPolling}
            onRefresh={loadTelegramStatus}
            isLoading={isLoading}
          />
        )}

        {/* Tab 4: Vercel Deploy Files */}
        {activeTab === 'export' && <VercelDeployFiles config={config} />}

        {/* Tab 5: Server Logs */}
        {activeTab === 'logs' && (
          <ServerLogsPanel logs={logs} onClearLogs={handleClearLogs} />
        )}
      </main>

      {/* Simulate Modal */}
      <SimulateModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulate={handleSimulate}
        isLoading={isLoading}
        isConfigured={Boolean(config?.isConfigured)}
      />
    </div>
  );
}
