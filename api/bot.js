import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN || '8988916261:AAF1b0yLepEVgdUPSike9NsENbWuTlHc4wc';
const myChatId = process.env.MY_CHAT_ID;
// List of keywords (can be configured via KEYWORDS environment variable as comma-separated values, or default list)
const keywordsList = process.env.KEYWORDS
  ? process.env.KEYWORDS.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
  : ['срочно', 'важно', 'цена', 'заказ', 'купить', 'помощь', 'клиент'];

const bot = new Telegraf(token);

function findKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywordsList.filter((kw) => lower.includes(kw));
}

bot.on(['message', 'channel_post'], async (ctx) => {
  try {
    const msg = ctx.message || ctx.channelPost;
    if (!msg) return;

    const chat = ctx.chat || msg.chat;
    const from = ctx.from || msg.from;
    const text = msg.text || msg.caption || '';

    if (chat && myChatId && chat.id.toString() === myChatId.toString()) {
      return;
    }

    if (!myChatId) {
      console.warn('MY_CHAT_ID не установлен в переменных окружения');
      return;
    }

    const title = chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || 'Чат';
    const sender = from?.username 
      ? `@${from.username}` 
      : `${from?.first_name || ''} ${from?.last_name || ''}`.trim() || 'Пользователь';

    // Keyword detection
    const matched = findKeywords(text);
    const hasKeyword = matched.length > 0;

    if (hasKeyword) {
      // Immediate push alert notification
      const alertHeader = `🚨 <b>ВНИМАНИЕ: СРАБОТАЛО КЛЮЧЕВОЕ СЛОВО!</b>\n` +
        `🔑 <b>Ключевые слова:</b> <code>${matched.join(', ')}</code>\n` +
        `👥 <b>Чат:</b> ${title} (<code>${chat.id}</code>)\n` +
        `👤 <b>Автор:</b> ${sender} (<code>${from?.id || 'N/A'}</code>)\n\n` +
        `💬 <i>${text.slice(0, 300)}</i>`;

      await ctx.telegram.sendMessage(myChatId, alertHeader, {
        parse_mode: 'HTML',
        disable_notification: false,
      });
    }

    try {
      await ctx.telegram.forwardMessage(myChatId, chat.id, msg.message_id);
    } catch (forwardErr) {
      const infoHeader = `${hasKeyword ? '🚨 <b>[КЛЮЧЕВОЕ СЛОВО: ' + matched.join(', ') + ']</b>\n' : ''}📩 <b>Источник:</b> ${title} (<code>${chat.id}</code>)\n👤 <b>Автор:</b> ${sender} (<code>${from?.id || 'N/A'}</code>)`;
      await ctx.telegram.sendMessage(myChatId, infoHeader, { parse_mode: 'HTML' });
      await ctx.telegram.copyMessage(myChatId, chat.id, msg.message_id);
    }
  } catch (err) {
    console.error('Ошибка при обработке:', err);
  }
});

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(body, res);
      if (!res.headersSent) {
        res.status(200).json({ ok: true });
      }
      return;
    }

    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action');

    let actionResultHtml = '';
    if (action === 'test-ping') {
      if (!myChatId) {
        actionResultHtml = '<div class="alert alert-error">❌ Ошибка: Переменная MY_CHAT_ID не указана в Vercel Environment Variables!</div>';
      } else {
        try {
          await bot.telegram.sendMessage(
            myChatId,
            `✅ <b>Тестовое уведомление от бота</b>\n\nСервер на Vercel работает идеально! Все входящие сообщения из групп будут мгновенно пересылаться в этот чат.`,
            { parse_mode: 'HTML' }
          );
          actionResultHtml = '<div class="alert alert-success">✅ Тестовое сообщение успешно отправлено в ваш Telegram! Проверьте диалог с ботом.</div>';
        } catch (e) {
          actionResultHtml = `<div class="alert alert-error">❌ Не удалось отправить сообщение: ${e.message}. Убедитесь, что вы нажали /start в боте.</div>`;
        }
      }
    }

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram Forwarder Bot — Панель управления</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --primary: #3b82f6;
      --success: #10b981;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px 16px; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .container { max-width: 650px; width: 100%; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
    .bot-icon { width: 56px; height: 56px; background: #2563eb; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .title h1 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: var(--success); font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); }
    .grid { display: grid; gap: 16px; margin-bottom: 24px; }
    .info-box { background: #1a2234; border: 1px solid #283548; border-radius: 12px; padding: 14px 18px; }
    .info-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .info-val { font-size: 14px; font-family: monospace; color: #60a5fa; word-break: break-all; }
    .alert { padding: 14px 18px; border-radius: 12px; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
    .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); color: #34d399; }
    .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid var(--error); color: #f87171; }
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 14px 20px; background: #2563eb; color: #fff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px; border: none; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .guide-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px; color: #e5e7eb; }
    ol { padding-left: 20px; color: #d1d5db; font-size: 14px; line-height: 1.8; }
    ol li span { color: #93c5fd; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="bot-icon">🤖</div>
        <div class="title">
          <h1>Telegram Forwarder Bot</h1>
          <div class="status-badge"><span class="status-dot"></span> Сервер активен (Vercel Serverless)</div>
        </div>
      </div>

      ${actionResultHtml}

      <div class="grid">
        <div class="info-box">
          <div class="info-label">Получатель сообщений (MY_CHAT_ID)</div>
          <div class="info-val">${myChatId ? myChatId : '<span style="color:#ef4444">Не задан! Укажите в Vercel Environment Variables</span>'}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Адрес Webhook для Telegram</div>
          <div class="info-val">https://${req.headers.host || 'ваш-домен.vercel.app'}/api/bot</div>
        </div>
      </div>

      <form method="GET" action="/">
        <input type="hidden" name="action" value="test-ping">
        <button type="submit" class="btn">🚀 Отправить тестовое сообщение в мой Telegram</button>
      </form>

      <div class="guide-title">Как работает бот:</div>
      <ol>
        <li>Добавьте бота в нужную группу или канал.</li>
        <li>Отключите приватность в <span>@BotFather</span> (команда <code>/setprivacy</code> ➡️ выберите бота ➡️ <b>Disable</b>), чтобы бот видел все сообщения.</li>
        <li>Любое новое сообщение из группы автоматически пересылается в ваш личный чат!</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
}