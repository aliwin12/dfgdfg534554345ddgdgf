import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN || '8988916261:AAF1b0yLepEVgdUPSike9NsENbWuTlHc4wc';
const myChatId = process.env.MY_CHAT_ID;

const bot = new Telegraf(token);

bot.on(['message', 'channel_post'], async (ctx) => {
  try {
    const msg = ctx.message || ctx.channelPost;
    if (!msg) return;

    const chat = ctx.chat || msg.chat;
    const from = ctx.from || msg.from;

    if (chat && myChatId && chat.id.toString() === myChatId.toString()) {
      return;
    }

    if (!myChatId) {
      console.warn('MY_CHAT_ID не установлен в переменных окружения');
      return;
    }

    try {
      await ctx.telegram.forwardMessage(myChatId, chat.id, msg.message_id);
    } catch (forwardErr) {
      const title = chat.title || 'Чат';
      const sender = from?.username 
        ? `@${from.username}` 
        : `${from?.first_name || ''} ${from?.last_name || ''}`.trim() || 'Пользователь';

      const infoHeader = `📩 <b>Источник:</b> ${title} (<code>${chat.id}</code>)\n👤 <b>Автор:</b> ${sender} (<code>${from?.id || 'N/A'}</code>)`;
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
    } else {
      res.status(200).send('Telegram Bot Webhook is running on Vercel Serverless!');
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
}