import React, { useState } from 'react';
import { X, Send, Sparkles, AlertCircle } from 'lucide-react';

interface SimulateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (groupTitle: string, senderName: string, text: string) => Promise<void>;
  isLoading: boolean;
  isConfigured: boolean;
}

export const SimulateModal: React.FC<SimulateModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
  isLoading,
  isConfigured,
}) => {
  const [groupTitle, setGroupTitle] = useState('Frontend & DevOps Chat');
  const [senderName, setSenderName] = useState('Алексей Смирнов');
  const [messageText, setMessageText] = useState(
    'Всем привет! Напоминаю, что релиз новой версии перенесен на 18:00. Проверьте свои пул-реквесты!'
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    await onSimulate(groupTitle, senderName, messageText);
    onClose();
  };

  const presetMessages = [
    {
      group: 'Крипто и Трейдинг Сигналы',
      sender: 'CryptoTrader_Pro',
      text: 'Внимание: точка входа по BTC 64,500. Стоп-лосс на 63,200. Тейк-профит 68,000.',
    },
    {
      group: 'Рабочий чат Команды',
      sender: 'Мария (Project Manager)',
      text: 'Коллеги, клиент утвердил макеты лендинга! Завтра созваниваемся в 11:00.',
    },
    {
      group: 'Аренда Недвижимости Москва',
      sender: 'Собственник_Квартиры',
      text: 'Сдается 2-комнатная квартира возле метро Сокол. 75к/мес без комиссии. Писать в ЛС.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="simulate-modal-box"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-base">
            <Sparkles className="w-5 h-5" />
            <h3>Симуляция входящего сообщения из группы</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Протестируйте перехват и пересылку сообщения так, будто кто-то только что написал в Telegram-группу.
          </p>
        </div>

        {!isConfigured && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Токен или Chat ID еще не заданы. Сообщение запишется в монитор на сайте, но не сможет отправиться в реальный Telegram.
            </span>
          </div>
        )}

        {/* Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-neutral-400">Быстрые примеры:</label>
          <div className="flex flex-wrap gap-1.5">
            {presetMessages.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setGroupTitle(preset.group);
                  setSenderName(preset.sender);
                  setMessageText(preset.text);
                }}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 text-[11px] text-neutral-300 transition-colors truncate max-w-[200px]"
              >
                {preset.group}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Название группы / чата:</label>
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Имя автора сообщения:</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Текст сообщения:</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              placeholder="Введите текст сообщения..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || !messageText.trim()}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Запустить симуляцию</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
