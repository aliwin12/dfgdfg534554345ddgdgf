const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN || '8988916261:AAF1b0yLepEVgdUPSike9NsENbWuTlHc4wc';
const myChatId = process.env.MY_CHAT_ID;

if (!token || !myChatId) {
  console.warn('Внимание: BOT_TOKEN или MY_CHAT_ID не заданы в переменных окружения.');
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
        ? `@${from.username}` 
        : `${from?.first_name || ''} ${from?.last_name || ''}`.trim() || 'Пользователь';

      const infoHeader = `📩 <b>Источник:</b> ${title} (<code>${chat.id}</code>)\n👤 <b>Автор:</b> ${sender} (<code>${from?.id || 'N/A'}</code>)`;
      
      await ctx.telegram.sendMessage(myChatId, infoHeader, { parse_mode: 'HTML' });
      await ctx.telegram.copyMessage(myChatId, chat.id, msg.message_id);
    }
  } catch (err) {
    console.error('Ошибка при обработке сообщения:', err);
  }
});

// Экспорт Serverless функции для Vercel и Express
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
};
