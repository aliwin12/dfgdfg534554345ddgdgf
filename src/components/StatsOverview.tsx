import React from 'react';
import { ForwardedMessage, WebhookInfo, BotInfo } from '../types';
import { MessageSquare, Users, Shield, Cpu } from 'lucide-react';

interface StatsOverviewProps {
  messages: ForwardedMessage[];
  webhookInfo: WebhookInfo | null;
  botInfo: BotInfo | null;
  mode: 'webhook' | 'polling' | 'idle';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  messages,
  webhookInfo,
  botInfo,
  mode,
}) => {
  // Compute unique groups
  const uniqueGroupIds = new Set(
    messages
      .filter((m) => m.sourceChat && m.sourceChat.id)
      .map((m) => m.sourceChat.id.toString())
  );

  const successfulForwards = messages.filter((m) => m.status === 'success').length;
  const pendingUpdates = webhookInfo?.pending_update_count ?? 0;

  return (
    <div id="stats-overview-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Stat 1 */}
      <div id="stat-messages" className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Переслано сообщений</span>
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-100">{messages.length}</span>
          <span className="text-xs text-emerald-400">({successfulForwards} успешно)</span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">
          {messages.length > 0 ? 'История в оперативной памяти' : 'Ожидание новых сообщений'}
        </span>
      </div>

      {/* Stat 2 */}
      <div id="stat-groups" className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Групп в мониторинге</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-100">{uniqueGroupIds.size}</span>
          <span className="text-xs text-neutral-400">чатов</span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">
          Группы, откуда поступали сообщения
        </span>
      </div>

      {/* Stat 3 */}
      <div id="stat-bot-status" className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Статус бота</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-neutral-100 truncate">
            {botInfo?.first_name || (botInfo?.username ? `@${botInfo.username}` : 'Не подключен')}
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">
          {botInfo?.can_read_all_group_messages
            ? '✅ Privacy Mode выключен'
            : 'ℹ️ Проверьте /setprivacy в @BotFather'}
        </span>
      </div>

      {/* Stat 4 */}
      <div id="stat-mode" className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Режим приема</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-neutral-100 capitalize">
            {mode === 'polling' ? 'Long Polling' : mode === 'webhook' ? 'Server Webhook' : 'Не активен'}
          </span>
          {mode === 'webhook' && pendingUpdates > 0 && (
            <span className="text-xs text-amber-400">({pendingUpdates} в очереди)</span>
          )}
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">
          {mode === 'webhook'
            ? webhookInfo?.url
              ? 'Webhook настроен в Telegram'
              : 'Готов к приему POST-запросов'
            : 'Прямой опрос Telegram'}
        </span>
      </div>
    </div>
  );
};
