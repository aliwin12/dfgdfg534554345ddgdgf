import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Download, FileCode, CheckCircle2 } from 'lucide-react';
import { BotConfig } from '../types';

interface VercelDeployFilesProps {
  config: BotConfig | null;
}

export const VercelDeployFiles: React.FC<VercelDeployFilesProps> = ({ config }) => {
  const [activeFile, setActiveFile] = useState<'bot' | 'vercel' | 'package' | 'gitignore'>('bot');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const files = {
    bot: {
      name: 'api/bot.js',
      lang: 'javascript',
      content: `const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN;
const myChatId = process.env.MY_CHAT_ID;

if (!token || !myChatId) {
  console.error('Ошибка: BOT_TOKEN или MY_CHAT_ID не заданы в переменных окружения.');
}

const bot = new Telegraf(token);

// Обработчик входящих сообщений и постов из каналов
bot.on(['message', 'channel_post'], async (ctx) => {
  try {
    const msg = ctx.message || ctx.channelPost;
    if (!msg) return;

    const chat = ctx.chat || msg.chat;
    const from = ctx.from || msg.from;

    // Не пересылаем сообщения из диалога с самим собой в ЛС
    if (chat && myChatId && chat.id.toString() === myChatId.toString()) {
      return;
    }

    // 1. Пробуем стандартный forward (сохраняет оригинальный тег автора)
    try {
      await ctx.telegram.forwardMessage(myChatId, chat.id, msg.message_id);
    } catch (forwardErr) {
      // 2. Запасной вариант: если в группе включена защита контента от пересылки
      const title = chat.title || 'Чат';
      const sender = from?.username 
        ? \`@\${from.username}\` 
        : \`\${from?.first_name || ''} \${from?.last_name || ''}\`.trim() || 'Пользователь';

      const infoHeader = \`📩 <b>Источник:</b> \${title} (<code>\${chat.id}</code>)\\n👤 <b>Автор:</b> \${sender} (<code>\${from?.id || 'N/A'}</code>)\`;
      
      await ctx.telegram.sendMessage(myChatId, infoHeader, { parse_mode: 'HTML' });
      await ctx.telegram.copyMessage(myChatId, chat.id, msg.message_id);
    }
  } catch (err) {
    console.error('Ошибка при обработке сообщения:', err);
  }
});

// Экспорт Serverless функции для Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
      if (!res.headersSent) {
        res.status(200).json({ ok: true });
      }
    } else {
      // GET-запрос для быстрой проверки доступности в браузере
      res.status(200).send('Telegram Bot Webhook is running on Vercel Serverless!');
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Internal Server Error');
  }
};`,
    },
    vercel: {
      name: 'vercel.json',
      lang: 'json',
      content: `{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/bot"
    }
  ]
}`,
    },
    package: {
      name: 'package.json',
      lang: 'json',
      content: `{
  "name": "telegram-forwarder-bot",
  "version": "1.0.0",
  "description": "Serverless Telegram forwarder bot for Vercel",
  "main": "api/bot.js",
  "scripts": {
    "start": "node api/bot.js"
  },
  "dependencies": {
    "telegraf": "^4.16.3"
  }
}`,
    },
    gitignore: {
      name: '.gitignore',
      lang: 'text',
      content: `node_modules/
.vercel/
.env
.DS_Store`,
    },
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const setWebhookUrlExample = `https://api.telegram.org/bot${
    config?.botTokenMasked ? '<ВАШ_ТОКЕН>' : '<ВАШ_BOT_TOKEN>'
  }/setWebhook?url=https://<ВАШ_ПРОЕКТ>.vercel.app/api/bot`;

  return (
    <div id="vercel-deploy-files" className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            Готовый код для Vercel Serverless Functions
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Этот код полностью готов к деплою на Vercel через GitHub репозиторий.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Открыть Vercel Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Tab Headers */}
        <div className="flex items-center justify-between bg-neutral-950 px-4 py-2.5 border-b border-neutral-800">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['bot', 'vercel', 'package', 'gitignore'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveFile(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                  activeFile === key
                    ? 'bg-neutral-800 text-sky-400 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                {files[key].name}
              </button>
            ))}
          </div>

          <button
            onClick={() => copyToClipboard(files[activeFile].content, activeFile)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            {copiedKey === activeFile ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Скопировать код</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-neutral-950/90 overflow-x-auto max-h-[460px]">
          <pre className="font-mono text-xs text-neutral-300 leading-relaxed">
            {files[activeFile].content}
          </pre>
        </div>
      </div>

      {/* Quick Setup Checklist */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Пошаговый чеклист деплоя на Vercel:
        </h3>

        <div className="space-y-3 text-xs text-neutral-300">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
            <span className="font-mono font-bold text-sky-400">01</span>
            <div className="space-y-1">
              <p className="font-semibold text-neutral-200">Создайте репозиторий и закоммитьте 4 файла выше</p>
              <p className="text-neutral-400">
                Создайте репозиторий на GitHub (например, <code>tg-forwarder-bot</code>) и добавьте в него папки <code>api/bot.js</code>, <code>vercel.json</code>, <code>package.json</code>, <code>.gitignore</code>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
            <span className="font-mono font-bold text-sky-400">02</span>
            <div className="space-y-1">
              <p className="font-semibold text-neutral-200">Импортируйте проект в Vercel и добавьте Environment Variables</p>
              <p className="text-neutral-400">
                В разделе <b>Settings → Environment Variables</b> укажите:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-0.5 font-mono text-[11px]">
                <li>BOT_TOKEN = ваш токен от @BotFather</li>
                <li>MY_CHAT_ID = ваш личный Telegram ID (куда пересылать)</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
            <span className="font-mono font-bold text-sky-400">03</span>
            <div className="space-y-2">
              <p className="font-semibold text-neutral-200">Активируйте Webhook вызовом setWebhook</p>
              <p className="text-neutral-400">
                После деплоя скопируйте Vercel-домен и откройте в браузере:
              </p>
              <div className="flex items-center gap-2">
                <code className="p-2 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-sky-300 break-all flex-1 font-mono">
                  {setWebhookUrlExample}
                </code>
                <button
                  onClick={() => copyToClipboard(setWebhookUrlExample, 'webhook-url')}
                  className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs shrink-0 flex items-center gap-1"
                >
                  {copiedKey === 'webhook-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
