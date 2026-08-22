import React, { useState, useEffect } from 'react';
import { BotConfig } from '../types';
import {
  Save,
  Key,
  User,
  Radio,
  Send,
  Trash2,
  HelpCircle,
  CheckCircle2,
  BellRing,
  Tag,
  Plus,
  X,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface BotConfigPanelProps {
  config: BotConfig | null;
  onSaveConfig: (
    token: string,
    chatId: string,
    keywords?: string[],
    forwardAll?: boolean,
    notifyKeywords?: boolean
  ) => Promise<void>;
  onSetWebhook: (url?: string) => Promise<void>;
  onDeleteWebhook: () => Promise<void>;
  onTogglePolling: () => Promise<void>;
  onSendTestMessage: () => Promise<void>;
  isLoading: boolean;
}

const PRESET_KEYWORDS = [
  'срочно',
  'важно',
  'цена',
  'купить',
  'заказ',
  'помощь',
  'клиент',
  'оплата',
  'бот',
  'поддержка',
];

export const BotConfigPanel: React.FC<BotConfigPanelProps> = ({
  config,
  onSaveConfig,
  onSetWebhook,
  onDeleteWebhook,
  onTogglePolling,
  onSendTestMessage,
  isLoading,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [chatIdInput, setChatIdInput] = useState(config?.myChatId || '');
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Keyword notification settings
  const [keywords, setKeywords] = useState<string[]>(
    config?.keywords && config.keywords.length > 0
      ? config.keywords
      : ['срочно', 'важно', 'цена', 'заказ', 'купить', 'помощь', 'клиент']
  );
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [forwardAllMessages, setForwardAllMessages] = useState<boolean>(
    config?.forwardAllMessages !== false
  );
  const [notifyOnKeyword, setNotifyOnKeyword] = useState<boolean>(
    config?.notifyOnKeyword !== false
  );

  // Sync inputs if config updates from server
  useEffect(() => {
    if (config?.myChatId && !chatIdInput) {
      setChatIdInput(config.myChatId);
    }
    if (config?.keywords && config.keywords.length > 0) {
      setKeywords(config.keywords);
    }
    if (typeof config?.forwardAllMessages === 'boolean') {
      setForwardAllMessages(config.forwardAllMessages);
    }
    if (typeof config?.notifyOnKeyword === 'boolean') {
      setNotifyOnKeyword(config.notifyOnKeyword);
    }
  }, [config]);

  const handleAddKeyword = (kwToAdd?: string) => {
    const raw = (kwToAdd || newKeywordInput).trim().toLowerCase();
    if (!raw) return;
    if (!keywords.map((k) => k.toLowerCase()).includes(raw)) {
      setKeywords([...keywords, raw]);
    }
    if (!kwToAdd) {
      setNewKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((k) => k.toLowerCase() !== kwToRemove.toLowerCase()));
  };

  const handleKeyDownKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig(
      tokenInput,
      chatIdInput,
      keywords,
      forwardAllMessages,
      notifyOnKeyword
    );
    setTokenInput('');
  };

  return (
    <div id="bot-config-panel" className="space-y-6">
      {/* Main Configuration Card */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-sky-400" />
            Ключи авторизации и Настройки пересылки
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Укажите токен бота из @BotFather и ваш персональный Telegram ID, куда будут приходить все сообщения.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BOT_TOKEN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  BOT_TOKEN (Токен бота)
                </label>
                {config?.hasToken && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 font-mono">
                    Задан ({config.botTokenMasked})
                  </span>
                )}
              </div>
              <input
                id="input-bot-token"
                type="password"
                placeholder={config?.hasToken ? '•••••••••••• (Оставьте пустым, чтобы не менять)' : '123456789:AA...'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 font-mono focus:outline-none focus:border-sky-500 transition-colors"
              />
              <p className="text-[11px] text-neutral-400">
                Получите у официального бота <span className="text-sky-400 font-medium">@BotFather</span> командой <code>/newbot</code>.
              </p>
            </div>

            {/* MY_CHAT_ID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  MY_CHAT_ID (Ваш личный ID в Telegram)
                </label>
                {config?.myChatId && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono">
                    ID: {config.myChatId}
                  </span>
                )}
              </div>
              <input
                id="input-my-chat-id"
                type="text"
                placeholder="Например: 123456789 или -100..."
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-neutral-400">
                Узнайте свой ID, написав боту <span className="text-indigo-400 font-medium">@userinfobot</span> или <span className="text-indigo-400 font-medium">@GetMyChatID_Bot</span>.
              </p>
            </div>
          </div>

          {/* KEYWORDS & SMART ALERT TRIGGER SECTION */}
          <div className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-100 uppercase tracking-wide">
                    Ключевые слова и Моментальные Push-уведомления
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Когда бот находит любое из этих слов в группе, он моментально присылает специальный звуковой алерт с деталями в ваш личный чат.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {keywords.length} активных триггеров
                </span>
              </div>
            </div>

            {/* Keyword tags list */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300">
                Список отслеживаемых ключевых слов:
              </label>
              <div className="flex flex-wrap items-center gap-2 min-h-[42px] p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-200 text-xs font-medium group transition-all hover:bg-amber-900/80"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-amber-400 hover:text-amber-100 rounded-full p-0.5 transition-colors"
                      title="Удалить слово"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Input for new keyword */}
                <div className="flex items-center gap-1 flex-1 min-w-[160px]">
                  <input
                    id="input-new-keyword"
                    type="text"
                    placeholder="Добавить слово и нажать Enter..."
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDownKeyword}
                    className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none px-1.5 py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddKeyword()}
                    disabled={!newKeywordInput.trim()}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-neutral-950 text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3 text-neutral-950" />
                    <span>Добавить</span>
                  </button>
                </div>
              </div>

              {/* Quick suggestions pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-neutral-500 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Быстрые подсказки:
                </span>
                {PRESET_KEYWORDS.filter((p) => !keywords.includes(p)).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddKeyword(preset)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification behavior toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-colors">
                <input
                  id="checkbox-notify-on-keyword"
                  type="checkbox"
                  checked={notifyOnKeyword}
                  onChange={(e) => setNotifyOnKeyword(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500/20"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-200 block">
                    🚨 Мгновенный Push-алерт при совпадении
                  </span>
                  <span className="text-[11px] text-neutral-400 block leading-tight">
                    Бот отправит отдельное громкое уведомление в ваш ЛС с плашкой «ВНИМАНИЕ: СРАБОТАЛО КЛЮЧЕВОЕ СЛОВО».
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-colors">
                <input
                  id="checkbox-forward-all"
                  type="checkbox"
                  checked={forwardAllMessages}
                  onChange={(e) => setForwardAllMessages(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-sky-500 focus:ring-sky-500/20"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-200 block">
                    📬 Пересылать абсолютно все сообщения
                  </span>
                  <span className="text-[11px] text-neutral-400 block leading-tight">
                    Если выключить, бот будет пересылать <b>только</b> сообщения, содержащие ключевые слова (режим строгого фильтра).
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <div className="flex items-center gap-3">
              {config?.isConfigured && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Конфигурация активна
                </span>
              )}
              <button
                id="btn-save-bot-config"
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить настройки и ключевые слова</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Launch & Test Banner when Configured */}
      {config?.isConfigured && (
        <div className="bg-gradient-to-r from-emerald-950/70 via-neutral-900 to-sky-950/70 border border-emerald-800/60 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Шаг 2 выполнен: Бот подключен! Что делать дальше:</span>
            </div>
            <p className="text-xs text-neutral-300 max-w-xl">
              Проверьте доставку сообщений кнопкой теста или сразу перейдите в <b>«Монитор сообщений»</b>, чтобы видеть историю и срабатывания ключевых слов в реальном времени.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-quick-test-ping"
              type="button"
              disabled={isLoading}
              onClick={onSendTestMessage}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-all flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Отправить тестовый пинг в ЛС
            </button>
            <button
              id="btn-quick-toggle-polling"
              type="button"
              disabled={isLoading}
              onClick={onTogglePolling}
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow transition-all flex items-center gap-2 ${
                config?.mode === 'polling'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {config?.mode === 'polling' ? 'Остановить Polling' : 'Включить Long Polling'}
            </button>
          </div>
        </div>
      )}

      {/* Connection & Webhook Management Actions */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Управление приемом сообщений (Webhook & Polling)
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Выберите, как бот будет получать обновления от серверов Telegram.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Set Webhook to Current Server */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Включить Server Webhook
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Свяжет бота с этим веб-сервером. Telegram будет слать POST-запросы прямо на этот URL.
              </p>
              <p className="text-[10px] text-neutral-400 font-mono break-all bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
                {config?.webhookUrl || 'URL будет сгенерирован автоматически'}
              </p>
            </div>
            <button
              id="btn-set-webhook-auto"
              type="button"
              disabled={isLoading || !config?.hasToken}
              onClick={() => onSetWebhook(customWebhookUrl || undefined)}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Radio className="w-3.5 h-3.5" />
              Привязать Webhook к серверу
            </button>
          </div>

          {/* Action 2: Toggle Polling */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
                <Radio className="w-4 h-4 text-amber-400" />
                {config?.mode === 'polling' ? 'Остановить Polling' : 'Включить Long Polling'}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Прямой опрос Telegram без вебхуков. Идеально для локальной разработки или если вебхук заблокирован.
              </p>
              <div className="text-[11px] font-mono text-amber-400 bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
                Статус: {config?.mode === 'polling' ? '🟢 Polling Активен' : '⚪ Выключен'}
              </div>
            </div>
            <button
              id="btn-toggle-polling"
              type="button"
              disabled={isLoading || !config?.hasToken}
              onClick={onTogglePolling}
              className={`w-full py-2 px-3 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                config?.mode === 'polling'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              } disabled:opacity-40`}
            >
              <Radio className="w-3.5 h-3.5" />
              {config?.mode === 'polling' ? 'Остановить Polling' : 'Запустить Long Polling'}
            </button>
          </div>

          {/* Action 3: Send Test Message to User DM */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
                <Send className="w-4 h-4 text-sky-400" />
                Тест связи с вашим чатом
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Бот отправит вам тестовое сообщение в Telegram, чтобы проверить, что бот может писать в указанный MY_CHAT_ID.
              </p>
              <p className="text-[10px] text-neutral-400">
                (Перед тестом не забудьте нажать <b>Start</b> в диалоге с ботом в Telegram!)
              </p>
            </div>
            <button
              id="btn-send-test-dm"
              type="button"
              disabled={isLoading || !config?.isConfigured}
              onClick={onSendTestMessage}
              className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Отправить тестовый пинг в ЛС
            </button>
          </div>
        </div>

        {/* Delete Webhook Button */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
          <button
            id="btn-delete-webhook"
            type="button"
            disabled={isLoading || !config?.hasToken}
            onClick={onDeleteWebhook}
            className="text-neutral-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Сбросить (удалить) Webhook из Telegram API
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
          >
            {showAdvanced ? 'Скрыть кастомный URL' : 'Указать кастомный Webhook URL'}
          </button>
        </div>

        {/* Custom Webhook URL Box */}
        {showAdvanced && (
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <label className="text-xs font-medium text-neutral-300">
              Произвольный Webhook URL (например, ваш домен Vercel):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://my-vercel-bot.vercel.app/api/bot"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200"
              />
              <button
                type="button"
                onClick={() => onSetWebhook(customWebhookUrl)}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
              >
                Применить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Setup Guide Accordion */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400" />
          Чек-лист правильной настройки в Telegram:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">
                1
              </span>
              Отключите приватность в @BotFather
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              По умолчанию боты в группах видят только команды. Чтобы бот видел все пересылаемые сообщения:
            </p>
            <div className="bg-neutral-900 p-2 rounded border border-neutral-800 font-mono text-[11px] text-amber-300">
              /setprivacy → Выберите бота → Disable
            </div>
            <p className="text-[10px] text-neutral-400">
              * Если бот уже был в группе, удалите его и добавьте заново после отключения приватности.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px]">
                2
              </span>
              Начните диалог с ботом в ЛС
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Telegram запрещает ботам писать пользователю первым. Обязательно откройте диалог со своим ботом в Telegram и нажмите кнопку <span className="text-neutral-200 font-semibold">«Start» (/start)</span>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">
                3
              </span>
              Добавьте бота в целевые группы
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Добавьте бота участником в группы или супергруппы. Рекомендуется дать ему права администратора, чтобы он гарантированно получал все типы медиа и защищенные сообщения.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[11px]">
                4
              </span>
              Защита от удаления и Content Protection
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Наш сервер автоматически пробует <code>forwardMessage</code>, а если в группе включен запрет пересылки («Защита контента»), автоматически делает <code>copyMessage</code> с сохранением автора и текста!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
