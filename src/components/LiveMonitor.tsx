import React, { useState } from 'react';
import { ForwardedMessage } from '../types';
import {
  Search,
  Trash2,
  Download,
  Send,
  MessageCircle,
  FileText,
  Image,
  Mic,
  Video,
  Check,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';

interface LiveMonitorProps {
  messages: ForwardedMessage[];
  onClearMessages: () => void;
  onOpenSimulate: () => void;
  isConfigured: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  messages,
  onClearMessages,
  onOpenSimulate,
  isConfigured,
  autoRefresh,
  setAutoRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Distinct groups for dropdown
  const uniqueGroups = Array.from(
    new Set(
      messages
        .filter((m) => m.sourceChat && m.sourceChat.title)
        .map((m) => m.sourceChat.title)
    )
  );

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    const textMatch =
      !searchQuery ||
      (msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (msg.caption && msg.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (msg.sender.firstName && msg.sender.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (msg.sender.username && msg.sender.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (msg.sourceChat.title && msg.sourceChat.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const groupMatch = selectedGroup === 'all' || msg.sourceChat.title === selectedGroup;
    const typeMatch = selectedType === 'all' || msg.messageType === selectedType;

    return textMatch && groupMatch && typeMatch;
  });

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telegram_messages_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <Image className="w-3.5 h-3.5 text-blue-400" />;
      case 'voice':
      case 'audio':
        return <Mic className="w-3.5 h-3.5 text-emerald-400" />;
      case 'video':
        return <Video className="w-3.5 h-3.5 text-purple-400" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <MessageCircle className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div id="live-monitor-container" className="space-y-4">
      {/* Alert if not fully configured */}
      {!isConfigured && (
        <div id="unconfigured-warning-banner" className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-amber-200 text-xs">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Бот еще не настроен!</p>
            <p className="text-amber-200/80 leading-relaxed">
              Чтобы бот начал пересылать реальные сообщения из ваших групп в Telegram, перейдите во вкладку{' '}
              <span className="font-bold text-amber-100 underline">«Настройка бота»</span> и укажите ваш BOT_TOKEN и MY_CHAT_ID.
              Вы также можете протестировать работу прямо сейчас с помощью кнопки <span className="font-bold text-amber-100">«Симулировать сообщение»</span>.
            </p>
          </div>
        </div>
      )}

      {/* Control Toolbar */}
      <div id="monitor-toolbar" className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-messages"
              type="text"
              placeholder="Поиск по тексту, автору или группе..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Filter by Group */}
          {uniqueGroups.length > 0 && (
            <select
              id="select-filter-group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">Все группы ({uniqueGroups.length})</option>
              {uniqueGroups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          )}

          {/* Filter by Type */}
          <select
            id="select-filter-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Все типы</option>
            <option value="text">Текст</option>
            <option value="photo">Фото</option>
            <option value="voice">Голосовые / Аудио</option>
            <option value="document">Документы</option>
            <option value="video">Видео</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-neutral-400 select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-neutral-950 border-neutral-800 text-sky-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Авто (2с)</span>
          </label>

          <button
            id="btn-simulate-msg"
            onClick={onOpenSimulate}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Симулировать</span>
          </button>

          {messages.length > 0 && (
            <>
              <button
                id="btn-export-json"
                onClick={exportToJson}
                title="Экспорт в JSON"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                id="btn-clear-messages"
                onClick={onClearMessages}
                title="Очистить историю"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/50 text-neutral-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages List Feed */}
      <div id="messages-feed" className="space-y-3">
        {filteredMessages.length === 0 ? (
          <div
            id="empty-feed-placeholder"
            className="bg-neutral-900/40 border border-dashed border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-neutral-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-200">
                {searchQuery || selectedGroup !== 'all' || selectedType !== 'all'
                  ? 'Сообщений не найдено'
                  : 'История сообщений пока пуста'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm">
                {searchQuery || selectedGroup !== 'all' || selectedType !== 'all'
                  ? 'Попробуйте сбросить фильтры поиска.'
                  : 'Когда бот получит сообщение из групп, оно мгновенно появится здесь и перешлется в ваш личный Telegram!'}
              </p>
            </div>
            <button
              onClick={onOpenSimulate}
              className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              Отправить тестовое сообщение
            </button>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const senderDisplay = msg.sender.username
              ? `@${msg.sender.username}`
              : `${msg.sender.firstName} ${msg.sender.lastName || ''}`.trim() || `User ID: ${msg.sender.id}`;

            const formattedTime = new Date(msg.date).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={msg.id}
                id={`message-card-${msg.id}`}
                className="bg-neutral-900/70 border border-neutral-800/90 hover:border-neutral-700 rounded-xl p-4 transition-all space-y-3"
              >
                {/* Header of message */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/60 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Source group tag */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      <span className="font-semibold">{msg.sourceChat.title}</span>
                      <span className="text-[10px] text-indigo-400 font-mono">({msg.sourceChat.id})</span>
                    </div>

                    {/* Sender tag */}
                    <div className="flex items-center gap-1 text-xs text-neutral-300">
                      <span className="text-neutral-400">Автор:</span>
                      <span className="font-medium text-neutral-200">{senderDisplay}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">({msg.sender.id})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Media type badge */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 text-[11px] text-neutral-300 capitalize font-mono">
                      {getMediaIcon(msg.messageType)}
                      <span>{msg.messageType}</span>
                    </div>

                    {/* Method badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        msg.forwardMethod === 'forwardMessage'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : msg.forwardMethod === 'copyMessage'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {msg.forwardMethod}
                    </span>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <Clock className="w-3 h-3" />
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="text-xs text-neutral-100 font-sans leading-relaxed break-words bg-neutral-950/50 p-3 rounded-lg border border-neutral-900">
                  {msg.text ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : msg.caption ? (
                    <div className="space-y-1">
                      <p className="text-neutral-400 text-[11px] italic">[Медиафайл с подписью]:</p>
                      <p className="whitespace-pre-wrap">{msg.caption}</p>
                    </div>
                  ) : (
                    <p className="text-neutral-400 italic">
                      [Входящий {msg.messageType} без текстовой подписи]
                    </p>
                  )}
                </div>

                {/* Footer status */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {msg.status === 'success' ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        Переслано в ваш ЛС
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400" title={msg.error}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Ошибка: {msg.error || 'Не удалось переслать'}
                      </span>
                    )}
                  </div>
                  <span className="text-neutral-400 font-mono">Telegram Msg ID: #{msg.telegramMessageId}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
