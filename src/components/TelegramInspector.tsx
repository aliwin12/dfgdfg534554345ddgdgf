import React from 'react';
import { BotInfo, WebhookInfo } from '../types';
import {
  ShieldCheck,
  Radio,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Server,
  Code,
  Info,
} from 'lucide-react';

interface TelegramInspectorProps {
  botInfo: BotInfo | null;
  webhookInfo: WebhookInfo | null;
  botError: string | null;
  webhookError: string | null;
  isPolling: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export const TelegramInspector: React.FC<TelegramInspectorProps> = ({
  botInfo,
  webhookInfo,
  botError,
  webhookError,
  isPolling,
  onRefresh,
  isLoading,
}) => {
  return (
    <div id="telegram-inspector" className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5">
        <div>
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            Прямая диагностика Telegram Bot API
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Актуальные данные напрямую из методов <code>getMe</code> и <code>getWebhookInfo</code>.
          </p>
        </div>

        <button
          id="btn-inspector-refresh"
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Опросить Telegram API</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bot Information Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Параметры бота (getMe)
            </h3>
            {botInfo?.username && (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-mono">
                @{botInfo.username}
              </span>
            )}
          </div>

          {botError ? (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ошибка getMe:</p>
                <p className="text-rose-200/80">{botError}</p>
              </div>
            </div>
          ) : botInfo ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">ID бота в Telegram:</span>
                <span className="font-mono text-neutral-200 font-medium">{botInfo.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Имя бота:</span>
                <span className="text-neutral-200 font-medium">{botInfo.first_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Username:</span>
                <span className="font-mono text-sky-400 font-medium">@{botInfo.username}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Может вступать в группы:</span>
                <span className="text-neutral-200">{botInfo.can_join_groups ? '✅ Да' : '❌ Нет'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Чтение всех сообщений групп:</span>
                <span className={`font-semibold ${botInfo.can_read_all_group_messages ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {botInfo.can_read_all_group_messages ? '✅ Включено (Privacy Disabled)' : '⚠️ Только обращения (Privacy Enabled)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-400">Инлайн-режим:</span>
                <span className="text-neutral-200">{botInfo.supports_inline_queries ? 'Да' : 'Нет'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">Данные бота еще не загружены. Укажите BOT_TOKEN.</p>
          )}
        </div>

        {/* Webhook Status Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              Статус Вебхука (getWebhookInfo)
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                isPolling
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                  : webhookInfo?.url
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {isPolling ? 'Long Polling' : webhookInfo?.url ? 'Webhook Активен' : 'Webhook не задан'}
            </span>
          </div>

          {webhookError ? (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ошибка getWebhookInfo:</p>
                <p className="text-rose-200/80">{webhookError}</p>
              </div>
            </div>
          ) : webhookInfo ? (
            <div className="space-y-3 text-xs">
              <div className="space-y-1 py-1 border-b border-neutral-800/50">
                <span className="text-neutral-400">Текущий Webhook URL в Telegram:</span>
                <p className="font-mono text-neutral-200 break-all bg-neutral-950 p-2 rounded border border-neutral-800/70">
                  {webhookInfo.url || '(пусто — вебхук не привязан)'}
                </p>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Сообщений в очереди Telegram:</span>
                <span className={`font-mono font-semibold ${webhookInfo.pending_update_count && webhookInfo.pending_update_count > 0 ? 'text-amber-400' : 'text-neutral-200'}`}>
                  {webhookInfo.pending_update_count ?? 0}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Макс. соединений:</span>
                <span className="font-mono text-neutral-200">{webhookInfo.max_connections ?? 40}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                <span className="text-neutral-400">Кастомный SSL сертификат:</span>
                <span className="text-neutral-200">{webhookInfo.has_custom_certificate ? 'Да' : 'Нет (используется Vercel/HTTPS)'}</span>
              </div>
              {webhookInfo.ip_address && (
                <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
                  <span className="text-neutral-400">IP адрес сервера:</span>
                  <span className="font-mono text-neutral-200">{webhookInfo.ip_address}</span>
                </div>
              )}
              {webhookInfo.last_error_message && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-[11px] text-rose-300 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-rose-400">
                    <Clock className="w-3 h-3" />
                    Последняя ошибка отправки от Telegram:
                  </div>
                  <p className="font-mono">{webhookInfo.last_error_message}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">Данные вебхука еще не загружены.</p>
          )}
        </div>
      </div>

      {/* Raw JSON Debugging */}
      {(botInfo || webhookInfo) && (
        <details className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 text-xs group">
          <summary className="font-medium text-neutral-300 cursor-pointer hover:text-white flex items-center gap-2 select-none">
            <Code className="w-4 h-4 text-sky-400" />
            Просмотреть сырой JSON-ответ от Telegram Bot API
          </summary>
          <pre className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto">
            {JSON.stringify({ bot: botInfo, webhook: webhookInfo }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
