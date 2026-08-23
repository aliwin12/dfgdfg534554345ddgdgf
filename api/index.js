import { Telegraf } from 'telegraf';

// Persistent in-memory storage during function lifetime
let botToken = process.env.BOT_TOKEN || '8988916261:AAF1b0yLepEVgdUPSike9NsENbWuTlHc4wc';
let myChatId = process.env.MY_CHAT_ID || '';
let watchedKeywords = process.env.KEYWORDS
  ? process.env.KEYWORDS.split(',').map((k) => k.trim()).filter(Boolean)
  : ['срочно', 'важно', 'цена', 'заказ', 'купить', 'помощь', 'клиент'];
let forwardAllMessages = true;
let notifyOnKeyword = true;

const messagesHistory = [];
const serverLogs = [];

function addLog(level, message, details) {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
  serverLogs.unshift(log);
  if (serverLogs.length > 200) serverLogs.pop();
  console.log(`[${level.toUpperCase()}] ${message}`, details || '');
}

function escapeHtml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function detectMessageType(msg) {
  if (!msg) return 'other';
  if (msg.text) return 'text';
  if (msg.photo) return 'photo';
  if (msg.video) return 'video';
  if (msg.document) return 'document';
  if (msg.voice) return 'voice';
  if (msg.audio) return 'audio';
  if (msg.sticker) return 'sticker';
  return 'other';
}

function detectMatchedKeywords(text, keywords) {
  if (!text || !keywords || keywords.length === 0) return [];
  const lower = text.toLowerCase();
  const matched = [];
  for (const kw of keywords) {
    const trimmed = kw.trim().toLowerCase();
    if (!trimmed) continue;
    if (lower.includes(trimmed)) {
      matched.push(kw.trim());
    }
  }
  return matched;
}

let botInstance = null;
let currentInitializedToken = null;

function getBot() {
  const tokenToUse = botToken || process.env.BOT_TOKEN;
  if (!tokenToUse) return null;
  if (botInstance && currentInitializedToken === tokenToUse) {
    return botInstance;
  }

  const bot = new Telegraf(tokenToUse);
  currentInitializedToken = tokenToUse;

  bot.command('start', async (ctx) => {
    const fromId = ctx.from?.id;
    addLog('info', `Получена команда /start от @${ctx.from?.username || 'user'} (ID: ${fromId})`);
    await ctx.reply(
      `👋 <b>Telegram Forwarder Bot активен!</b>\n\n` +
      `🆔 Ваш Telegram ID: <code>${fromId}</code>\n\n` +
      `📌 <b>Быстрый старт:</b>\n` +
      `1. Укажите этот ID (<code>${fromId}</code>) в настройках панели.\n` +
      `2. Добавьте этого бота в группы/каналы, из которых нужно пересылать сообщения.\n` +
      `3. Бот будет автоматически пересылать все сообщения и слать Push-алерты по ключевым словам!`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('id', async (ctx) => {
    const fromId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    await ctx.reply(
      `🆔 <b>Ваш Telegram ID:</b> <code>${fromId}</code>\n💬 <b>ID этого чата:</b> <code>${chatId}</code>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.on(['message', 'channel_post'], async (ctx) => {
    try {
      const msg = ctx.message || ctx.channelPost;
      if (!msg) return;

      const chat = ctx.chat || msg.chat;
      const from = ctx.from || msg.from || { id: 'unknown', first_name: 'Unknown' };
      const text = msg.text || msg.caption || '';
      const msgType = detectMessageType(msg);

      const isPrivateSelfChat = chat && myChatId && chat.id.toString() === myChatId.toString();
      if (isPrivateSelfChat) {
        addLog('info', `Получено личное сообщение от вас (Chat ID ${chat.id}): "${text || msgType}"`);
        if (text && !text.startsWith('/')) {
          try {
            await ctx.reply(`✅ <b>Бот на связи!</b>\n\nСообщение: <i>${escapeHtml(text)}</i>\n\nБот готов к пересылке сообщений из групп.`, { parse_mode: 'HTML' });
          } catch (e) {}
        }
      }

      const title = chat?.title || `${chat?.first_name || ''} ${chat?.last_name || ''}`.trim() || 'Чат';
      const senderName = from.username
        ? `@${from.username}`
        : `${from.first_name || ''} ${from.last_name || ''}`.trim() || `User ${from.id}`;

      const matchedKeywords = detectMatchedKeywords(text, watchedKeywords);
      const hasKeywordMatch = matchedKeywords.length > 0;
      const shouldForward = forwardAllMessages || hasKeywordMatch;

      addLog(
        hasKeywordMatch ? 'warn' : 'info',
        `${hasKeywordMatch ? '🚨 [КЛЮЧЕВОЕ СЛОВО: ' + matchedKeywords.join(', ') + ']' : 'Получено'} сообщение из «${title}» (${chat?.id}) от ${senderName}: ${text ? text.slice(0, 50) : `[${msgType}]`}`
      );

      let forwardMethod = 'forwardMessage';
      let forwardStatus = 'success';
      let errorMessage = undefined;

      if (isPrivateSelfChat) {
        forwardStatus = 'success';
        forwardMethod = 'simulated';
      } else if (!shouldForward) {
        addLog('info', `Сообщение пропущено фильтром ключевых слов`);
        forwardStatus = 'success';
        forwardMethod = 'simulated';
      } else if (myChatId) {
        try {
          if (hasKeywordMatch && notifyOnKeyword) {
            const alertBadge = `🚨 <b>ВНИМАНИЕ: СРАБОТАЛО КЛЮЧЕВОЕ СЛОВО!</b>\n` +
              `🔑 <b>Ключевые слова:</b> <code>${escapeHtml(matchedKeywords.join(', '))}</code>\n` +
              `👥 <b>Чат:</b> ${escapeHtml(title)} (<code>${chat.id}</code>)\n` +
              `👤 <b>Отправитель:</b> ${escapeHtml(senderName)} (<code>${from.id}</code>)\n\n` +
              `💬 <i>${escapeHtml(text.slice(0, 300))}${text.length > 300 ? '...' : ''}</i>`;

            await bot.telegram.sendMessage(myChatId, alertBadge, {
              parse_mode: 'HTML',
              disable_notification: false,
            });
            addLog('success', `Отправлен Push-алерт по ключевым словам: ${matchedKeywords.join(', ')}`);
          }

          await bot.telegram.forwardMessage(myChatId, chat.id, msg.message_id);
          forwardMethod = 'forwardMessage';
          addLog('success', `Успешно переслано в ID ${myChatId}`);
        } catch (err) {
          addLog('warn', `forwardMessage не удался (${err.message}). Пробуем copyMessage...`);
          try {
            const header = `${hasKeywordMatch ? '🚨 <b>[КЛЮЧЕВОЕ СЛОВО: ' + escapeHtml(matchedKeywords.join(', ')) + ']</b>\n' : ''}📩 <b>Источник:</b> ${escapeHtml(title)} (<code>${chat.id}</code>)\n👤 <b>Автор:</b> ${escapeHtml(senderName)} (<code>${from.id}</code>)`;
            await bot.telegram.sendMessage(myChatId, header, { parse_mode: 'HTML' });
            await bot.telegram.copyMessage(myChatId, chat.id, msg.message_id);
            forwardMethod = 'copyMessage';
            addLog('success', `Успешно скопировано (copyMessage) в ID ${myChatId}`);
          } catch (copyErr) {
            forwardStatus = 'failed';
            errorMessage = copyErr.message || err.message;
            addLog('error', `Ошибка пересылки: ${errorMessage}`);
          }
        }
      } else {
        forwardStatus = 'failed';
        errorMessage = 'MY_CHAT_ID не настроен';
        addLog('warn', `Сообщение получено, но MY_CHAT_ID не задан`);
      }

      const recordedItem = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        telegramMessageId: msg.message_id || Date.now(),
        date: msg.date ? msg.date * 1000 : Date.now(),
        sourceChat: {
          id: chat?.id || 'unknown',
          title: title,
          type: chat?.type || 'group',
          username: chat?.username,
        },
        sender: {
          id: from.id || 'unknown',
          firstName: from.first_name || 'Anonymous',
          lastName: from.last_name,
          username: from.username,
          isBot: from.is_bot,
        },
        messageType: msgType,
        text: msg.text,
        caption: msg.caption,
        forwardMethod,
        status: forwardStatus,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : undefined,
      };

      messagesHistory.unshift(recordedItem);
      if (messagesHistory.length > 100) messagesHistory.pop();
    } catch (error) {
      addLog('error', `Ошибка обработки вебхука: ${error.message}`);
    }
  });

  botInstance = bot;
  return bot;
}

// Main Vercel Serverless Function Handler
export default async function handler(req, res) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlObj = new URL(req.url, `https://${req.headers['x-forwarded-host'] || req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname.replace(/^\/api/, ''); // normalize path

  const parseBody = () => {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch (e) {
        return {};
      }
    }
    return req.body;
  };

  const body = parseBody();

  // 1. Telegram Inbound Webhook: /telegram-webhook OR /bot
  if (pathname === '/telegram-webhook' || pathname === '/bot' || pathname === '' && req.method === 'POST') {
    const bot = getBot();
    if (!bot) {
      addLog('error', 'Вебхук получен, но BOT_TOKEN не настроен');
      return res.status(200).json({ ok: true, note: 'bot not initialized' });
    }
    try {
      const update = body;
      addLog('info', `Получен входящий POST-запрос на Webhook (Update ID: ${update?.update_id || 'N/A'})`);
      await bot.handleUpdate(update);
      return res.status(200).json({ ok: true });
    } catch (err) {
      addLog('error', `Ошибка обработки Telegraf update: ${err.message}`);
      return res.status(200).json({ ok: true, error: err.message });
    }
  }

  // 2. GET /status
  if (pathname === '/status' || pathname === '') {
    const bot = getBot();
    let botInfo = null;
    let webhookInfo = null;

    if (bot) {
      try {
        const me = await bot.telegram.getMe();
        botInfo = {
          id: me.id,
          username: me.username,
          firstName: me.first_name,
        };
      } catch (e) {}

      try {
        const wh = await bot.telegram.getWebhookInfo();
        webhookInfo = {
          url: wh.url,
          hasCustomCertificate: wh.has_custom_certificate,
          pendingUpdateCount: wh.pending_update_count,
          lastErrorDate: wh.last_error_date,
          lastErrorMessage: wh.last_error_message,
        };
      } catch (e) {}
    }

    return res.status(200).json({
      isConfigured: Boolean(botToken && myChatId),
      botTokenSet: Boolean(botToken),
      myChatIdSet: Boolean(myChatId),
      myChatId: myChatId ? `${myChatId.slice(0, 4)}***` : '',
      mode: 'webhook',
      botInfo,
      webhookInfo,
      isPolling: false,
      keywords: watchedKeywords,
      forwardAllMessages,
      notifyOnKeyword,
      platform: 'vercel',
    });
  }

  // 3. GET/POST /config
  if (pathname === '/config') {
    if (req.method === 'POST') {
      const { token, chatId, keywords, forwardAll, notifyKeywords } = body;
      if (typeof chatId === 'string') myChatId = chatId.trim();
      if (typeof token === 'string' && token.trim()) {
        botToken = token.trim();
        botInstance = null; // force re-init
      }
      if (Array.isArray(keywords)) {
        watchedKeywords = keywords.map((k) => String(k).trim()).filter(Boolean);
      }
      if (typeof forwardAll === 'boolean') forwardAllMessages = forwardAll;
      if (typeof notifyKeywords === 'boolean') notifyOnKeyword = notifyKeywords;

      // Auto-set webhook on public domain
      const bot = getBot();
      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const autoWebhookUrl = `${proto}://${host}/api/telegram-webhook`;

      if (bot && botToken && host) {
        try {
          await bot.telegram.setWebhook(autoWebhookUrl, {
            drop_pending_updates: false,
            allowed_updates: ['message', 'channel_post', 'edited_message'],
          });
          addLog('success', `⚡ Webhook автоматически привязан: ${autoWebhookUrl}`);
        } catch (whErr) {
          addLog('warn', `Авто-привязка Webhook: ${whErr.message}`);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Настройки сохранены и Webhook привязан!',
        keywords: watchedKeywords,
        forwardAllMessages,
        notifyOnKeyword,
      });
    }

    return res.status(200).json({
      botToken: botToken ? `${botToken.slice(0, 6)}...` : '',
      myChatId,
      watchedKeywords,
      forwardAllMessages,
      notifyOnKeyword,
    });
  }

  // 4. GET /stats
  if (pathname === '/stats') {
    const total = messagesHistory.length;
    const successful = messagesHistory.filter((m) => m.status === 'success').length;
    const failed = messagesHistory.filter((m) => m.status === 'failed').length;
    const keywordMatches = messagesHistory.filter((m) => m.matchedKeywords && m.matchedKeywords.length > 0).length;

    return res.status(200).json({
      totalMessages: total,
      successfulForwards: successful,
      failedForwards: failed,
      keywordAlerts: keywordMatches,
      lastActive: messagesHistory[0]?.timestamp || null,
    });
  }

  // 5. GET /messages
  if (pathname === '/messages') {
    return res.status(200).json(messagesHistory);
  }

  // 6. GET /logs
  if (pathname === '/logs') {
    return res.status(200).json(serverLogs);
  }

  // 7. POST /telegram/send-test
  if (pathname === '/telegram/send-test') {
    const bot = getBot();
    if (!botToken || !bot) {
      return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
    }
    if (!myChatId) {
      return res.status(400).json({ success: false, error: 'MY_CHAT_ID не указан' });
    }

    try {
      const text = body.text || `🔔 <b>Тестовое сообщение от Telegram Forwarder (Vercel)</b>\n\n✅ Сервер работает идеально!\n📅 Время: <code>${new Date().toLocaleString('ru-RU')}</code>\n⚡ Режим: <code>Webhook Serverless</code>`;
      await bot.telegram.sendMessage(myChatId, text, { parse_mode: 'HTML' });
      addLog('success', `Тестовое сообщение успешно отправлено в ЛС (ID: ${myChatId})`);
      return res.status(200).json({ success: true, message: 'Сообщение успешно отправлено!' });
    } catch (err) {
      addLog('error', `Не удалось отправить тест: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 8. POST /telegram/auto-fix
  if (pathname === '/telegram/auto-fix') {
    const bot = getBot();
    if (!botToken || !bot) {
      return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
    }

    const steps = [];

    // Step 1: Token verification
    try {
      const me = await bot.telegram.getMe();
      steps.push({
        step: 'bot_auth',
        status: 'ok',
        message: `Бот авторизован: @${me.username} (${me.first_name})`,
      });
    } catch (e) {
      steps.push({
        step: 'bot_auth',
        status: 'error',
        message: `Ошибка токена: ${e.message}`,
      });
      return res.json({ success: false, steps, error: 'Токен бота недействителен' });
    }

    // Step 2: Webhook registration
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = `${proto}://${host}/api/telegram-webhook`;

    try {
      await bot.telegram.setWebhook(webhookUrl, {
        drop_pending_updates: false,
        allowed_updates: ['message', 'channel_post', 'edited_message'],
      });
      steps.push({
        step: 'webhook',
        status: 'ok',
        message: `Webhook успешно привязан: ${webhookUrl}`,
      });
      addLog('success', `[Auto-Fix] Webhook установлен на ${webhookUrl}`);
    } catch (e) {
      steps.push({
        step: 'webhook',
        status: 'error',
        message: `Не удалось установить Webhook: ${e.message}`,
      });
    }

    // Step 3: Test send message
    if (myChatId) {
      try {
        await bot.telegram.sendMessage(
          myChatId,
          `🛠 <b>Авто-проверка Telegram Forwarder (Vercel)</b>\n\n✅ Связь с сервером успешно налажена!\n⚡ Режим: <code>Vercel Serverless Webhook</code>\n🌐 Хост: <code>${host}</code>`,
          { parse_mode: 'HTML' }
        );
        steps.push({
          step: 'send_test',
          status: 'ok',
          message: `Тестовое сообщение доставлено в Telegram (ID ${myChatId})`,
        });
        addLog('success', `[Auto-Fix] Тестовое сообщение доставлено пользователю ${myChatId}`);
      } catch (e) {
        steps.push({
          step: 'send_test',
          status: 'error',
          message: `Ошибка отправки в ID ${myChatId}: ${e.message}`,
        });
      }
    } else {
      steps.push({
        step: 'send_test',
        status: 'skipped',
        message: 'MY_CHAT_ID не указан в настройках',
      });
    }

    const allOk = steps.every((s) => s.status === 'ok' || s.status === 'skipped');
    return res.json({
      success: allOk,
      steps,
      botMode: 'webhook',
    });
  }

  // 9. POST /telegram/set-webhook
  if (pathname === '/telegram/set-webhook') {
    const bot = getBot();
    if (!botToken || !bot) {
      return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
    }
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const targetUrl = body.url || `${proto}://${host}/api/telegram-webhook`;

    try {
      await bot.telegram.setWebhook(targetUrl, {
        drop_pending_updates: false,
        allowed_updates: ['message', 'channel_post', 'edited_message'],
      });
      addLog('success', `Webhook успешно привязан: ${targetUrl}`);
      return res.json({ success: true, url: targetUrl, message: 'Webhook успешно установлен!' });
    } catch (err) {
      addLog('error', `Ошибка установки Webhook: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 10. POST /telegram/delete-webhook
  if (pathname === '/telegram/delete-webhook') {
    const bot = getBot();
    if (!botToken || !bot) {
      return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
    }
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
      addLog('info', 'Webhook успешно удален');
      return res.json({ success: true, message: 'Webhook удален' });
    } catch (err) {
      addLog('error', `Ошибка удаления Webhook: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 11. POST /simulate
  if (pathname === '/simulate') {
    const { groupTitle, senderName, text } = body;
    const fakeUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
      message: {
        message_id: Math.floor(Math.random() * 1000000),
        date: Math.floor(Date.now() / 1000),
        chat: {
          id: -1001987654321,
          title: groupTitle || 'Тестовая Группа',
          type: 'supergroup',
        },
        from: {
          id: 99887766,
          is_bot: false,
          first_name: senderName || 'Клиент',
          username: 'test_client',
        },
        text: text || 'Здравствуйте, интересует цена на товар, срочно!',
      },
    };

    const bot = getBot();
    if (bot) {
      await bot.handleUpdate(fakeUpdate);
    }
    return res.json({ success: true, message: 'Симуляция отправлена' });
  }

  // Fallback 404
  return res.status(404).json({ error: `Not found: ${pathname}` });
}
