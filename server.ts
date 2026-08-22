import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory application state
let botToken: string = process.env.BOT_TOKEN || '';
let myChatId: string = process.env.MY_CHAT_ID || '';
let botMode: 'webhook' | 'polling' | 'idle' = botToken ? 'webhook' : 'idle';
let currentBot: Telegraf | null = null;
let isPollingRunning = false;

interface StoredMessage {
  id: string;
  telegramMessageId: number;
  date: number;
  sourceChat: {
    id: number | string;
    title: string;
    type: string;
    username?: string;
  };
  sender: {
    id: number | string;
    firstName: string;
    lastName?: string;
    username?: string;
    isBot?: boolean;
  };
  messageType: 'text' | 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'sticker' | 'other';
  text?: string;
  caption?: string;
  forwardMethod: 'forwardMessage' | 'copyMessage' | 'simulated';
  status: 'success' | 'failed';
  error?: string;
  timestamp: string;
}

interface StoredLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

const messagesHistory: StoredMessage[] = [];
const serverLogs: StoredLog[] = [];

function addLog(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) {
  const log: StoredLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
  serverLogs.unshift(log);
  if (serverLogs.length > 300) {
    serverLogs.pop();
  }
  console.log(`[${level.toUpperCase()}] ${message}`, details || '');
}

function detectMessageType(msg: any): 'text' | 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'sticker' | 'other' {
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

// Forwarding Logic
async function handleIncomingTelegramMessage(ctx: any, sourceTag = 'telegram') {
  try {
    const msg = ctx.message || ctx.channelPost;
    if (!msg) return;

    const chat = ctx.chat || msg.chat;
    const from = ctx.from || msg.from || { id: 'unknown', first_name: 'Unknown' };
    const text = msg.text || msg.caption || '';
    const msgType = detectMessageType(msg);

    // Skip if message is directly in private chat with ourself
    if (chat && myChatId && chat.id.toString() === myChatId.toString()) {
      addLog('info', `Игнорировано сообщение из личного диалога (Chat ID ${chat.id})`);
      return;
    }

    const title = chat?.title || `${chat?.first_name || ''} ${chat?.last_name || ''}`.trim() || 'Группа';
    const senderName = from.username
      ? `@${from.username}`
      : `${from.first_name || ''} ${from.last_name || ''}`.trim() || `User ${from.id}`;

    addLog('info', `Получено сообщение из «${title}» (${chat?.id}) от ${senderName}: ${text ? text.slice(0, 50) : `[${msgType}]`}`);

    let forwardMethod: 'forwardMessage' | 'copyMessage' | 'simulated' = 'forwardMessage';
    let forwardStatus: 'success' | 'failed' = 'success';
    let errorMessage: string | undefined = undefined;

    if (myChatId && currentBot) {
      try {
        // Attempt standard forwardMessage (preserves original author tag)
        await currentBot.telegram.forwardMessage(myChatId, chat.id, msg.message_id);
        forwardMethod = 'forwardMessage';
        addLog('success', `Успешно переслано (forwardMessage) в ID ${myChatId}`);
      } catch (err: any) {
        addLog('warn', `forwardMessage не удался (${err.message}). Пробуем copyMessage с заголовком...`);
        try {
          // If forward fails (e.g. protected content, restricted group), use copyMessage
          const header = `📩 <b>Источник:</b> ${escapeHtml(title)} (<code>${chat.id}</code>)\n👤 <b>Автор:</b> ${escapeHtml(senderName)} (<code>${from.id}</code>)`;
          await currentBot.telegram.sendMessage(myChatId, header, { parse_mode: 'HTML' });
          await currentBot.telegram.copyMessage(myChatId, chat.id, msg.message_id);
          forwardMethod = 'copyMessage';
          addLog('success', `Успешно отправлено через copyMessage в ID ${myChatId}`);
        } catch (copyErr: any) {
          forwardStatus = 'failed';
          errorMessage = copyErr.message || err.message;
          addLog('error', `Ошибка пересылки сообщения в Telegram: ${errorMessage}`);
        }
      }
    } else {
      forwardStatus = 'failed';
      errorMessage = !myChatId ? 'MY_CHAT_ID не настроен' : 'Бот не инициализирован';
      addLog('warn', `Сообщение сохранено локально, но не отправлено: ${errorMessage}`);
    }

    const recordedItem: StoredMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      telegramMessageId: msg.message_id || Date.now(),
      date: msg.date ? msg.date * 1000 : Date.now(),
      sourceChat: {
        id: chat?.id || 'simulated',
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
    };

    messagesHistory.unshift(recordedItem);
    if (messagesHistory.length > 200) {
      messagesHistory.pop();
    }
  } catch (error: any) {
    addLog('error', `Критическая ошибка обработки сообщения: ${error.message}`);
  }
}

function escapeHtml(unsafe: string) {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Bot Setup & Init
function initBotInstance(token: string) {
  if (isPollingRunning && currentBot) {
    try {
      currentBot.stop('Reinitializing bot');
      isPollingRunning = false;
    } catch (e) {
      console.error('Error stopping polling:', e);
    }
  }

  if (!token || token.trim() === '') {
    currentBot = null;
    botMode = 'idle';
    addLog('info', 'Бот отключен (пустой токен)');
    return null;
  }

  try {
    const bot = new Telegraf(token.trim());

    // Bot Commands & Handlers
    bot.start((ctx) => {
      const from = ctx.from;
      const response = `👋 <b>Бот-пересыльщик активен!</b>\n\nВаш Chat ID: <code>${from.id}</code>\n\nДобавьте меня в группы, отключите приватность в @BotFather (/setprivacy -> Disable), и я буду пересылать все сообщения в ваш личный чат.`;
      ctx.replyWithHTML(response);
    });

    bot.command('myid', (ctx) => {
      ctx.replyWithHTML(`Ваш Telegram Chat ID: <code>${ctx.chat.id}</code>`);
    });

    bot.on(['message', 'channel_post'], async (ctx) => {
      await handleIncomingTelegramMessage(ctx);
    });

    bot.catch((err: any, ctx: any) => {
      addLog('error', `Telegraf ошибка: ${err.message}`, { updateType: ctx.updateType });
    });

    currentBot = bot;
    addLog('success', 'Экземпляр Telegraf успешно инициализирован');
    return bot;
  } catch (err: any) {
    addLog('error', `Ошибка инициализации Telegraf: ${err.message}`);
    currentBot = null;
    return null;
  }
}

// Initialize on startup if token exists
if (botToken) {
  initBotInstance(botToken);
}

// API Routes
app.get('/api/config', (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const detectedServerUrl = process.env.APP_URL || `${protocol}://${host}`;
  const webhookUrl = `${detectedServerUrl}/api/telegram-webhook`;

  const maskedToken = botToken
    ? `${botToken.substring(0, 6)}...${botToken.substring(botToken.length - 4)}`
    : '';

  res.json({
    hasToken: Boolean(botToken),
    botTokenMasked: maskedToken,
    myChatId,
    mode: isPollingRunning ? 'polling' : botToken ? 'webhook' : 'idle',
    webhookUrl,
    serverUrl: detectedServerUrl,
    isConfigured: Boolean(botToken && myChatId),
  });
});

app.post('/api/config', (req, res) => {
  const { token, chatId } = req.body;

  if (typeof chatId === 'string') {
    myChatId = chatId.trim();
  }

  if (typeof token === 'string') {
    const trimmed = token.trim();
    if (trimmed !== botToken) {
      botToken = trimmed;
      initBotInstance(botToken);
    }
  }

  addLog('info', `Настройки обновлены: Chat ID = ${myChatId || 'не задан'}, Bot Token = ${botToken ? 'задан' : 'пустой'}`);

  res.json({
    success: true,
    message: 'Настройки успешно сохранены',
  });
});

// Telegram API Proxy & Diagnostics
app.get('/api/telegram/status', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.json({
      configured: false,
      error: 'BOT_TOKEN не задан. Введите токен в настройках.',
    });
  }

  try {
    const [botInfo, webhookInfo] = await Promise.allSettled([
      currentBot.telegram.getMe(),
      currentBot.telegram.getWebhookInfo(),
    ]);

    let botData = null;
    let webhookData = null;
    let botError = null;
    let webhookError = null;

    if (botInfo.status === 'fulfilled') {
      botData = botInfo.value;
    } else {
      botError = botInfo.reason?.message || 'Не удалось получить информацию о боте';
    }

    if (webhookInfo.status === 'fulfilled') {
      webhookData = webhookInfo.value;
    } else {
      webhookError = webhookInfo.reason?.message || 'Не удалось получить статус Webhook';
    }

    res.json({
      configured: true,
      bot: botData,
      webhook: webhookData,
      isPolling: isPollingRunning,
      botError,
      webhookError,
    });
  } catch (err: any) {
    res.status(500).json({
      configured: true,
      error: err.message || 'Ошибка запроса к Telegram API',
    });
  }
});

// Set Webhook
app.post('/api/telegram/set-webhook', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
  }

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const defaultUrl = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, '')}/api/telegram-webhook`
    : `${protocol}://${host}/api/telegram-webhook`;

  const webhookUrl = req.body.url || defaultUrl;

  try {
    if (isPollingRunning) {
      currentBot.stop('Switching to webhook');
      isPollingRunning = false;
    }

    await currentBot.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: Boolean(req.body.dropPendingUpdates),
      allowed_updates: ['message', 'channel_post', 'edited_message'],
    });

    botMode = 'webhook';
    addLog('success', `Вебхук успешно установлен на: ${webhookUrl}`);
    res.json({ success: true, url: webhookUrl });
  } catch (err: any) {
    addLog('error', `Ошибка установки вебхука: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Webhook
app.post('/api/telegram/delete-webhook', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
  }

  try {
    await currentBot.telegram.deleteWebhook({
      drop_pending_updates: Boolean(req.body.dropPendingUpdates),
    });
    addLog('info', 'Вебхук удален из Telegram API');
    res.json({ success: true });
  } catch (err: any) {
    addLog('error', `Ошибка удаления вебхука: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle Long Polling
app.post('/api/telegram/toggle-polling', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
  }

  try {
    if (isPollingRunning) {
      currentBot.stop('Manual stop polling');
      isPollingRunning = false;
      botMode = 'webhook';
      addLog('info', 'Режим Polling остановлен');
      res.json({ success: true, isPolling: false });
    } else {
      // First delete webhook so polling can connect
      await currentBot.telegram.deleteWebhook();
      currentBot.launch({
        allowedUpdates: ['message', 'channel_post', 'edited_message'],
      }).catch((e: any) => {
        addLog('error', `Ошибка в процессе polling: ${e.message}`);
        isPollingRunning = false;
      });

      isPollingRunning = true;
      botMode = 'polling';
      addLog('success', 'Режим Long Polling запущен! Бот опрашивает Telegram напрямую');
      res.json({ success: true, isPolling: true });
    }
  } catch (err: any) {
    addLog('error', `Ошибка переключения polling: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send Test Message directly to MY_CHAT_ID
app.post('/api/telegram/send-test', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
  }
  if (!myChatId) {
    return res.status(400).json({ success: false, error: 'MY_CHAT_ID не указан' });
  }

  try {
    const text = req.body.text || `🔔 <b>Тестовое сообщение от Telegram Forwarder Server</b>\n\nСервер работает штатно!\n📅 Время: <code>${new Date().toLocaleString('ru-RU')}</code>\n🔗 Режим: <code>${isPollingRunning ? 'Long Polling' : 'Webhook Serverless'}</code>`;
    
    await currentBot.telegram.sendMessage(myChatId, text, { parse_mode: 'HTML' });
    addLog('success', `Тестовое сообщение успешно отправлено в ЛС (ID: ${myChatId})`);
    res.json({ success: true });
  } catch (err: any) {
    addLog('error', `Не удалось отправить тестовое сообщение: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulate Message from Group
app.post('/api/telegram/simulate-message', async (req, res) => {
  const { groupTitle = 'Тестовая Группа IT', senderName = 'Иван Иванов', text = 'Привет! Это тестовое сообщение для проверки пересылки истории сообщений.' } = req.body;

  const fakeMessageUpdate = {
    message: {
      message_id: Math.floor(Math.random() * 90000) + 10000,
      date: Math.floor(Date.now() / 1000),
      chat: {
        id: -1001234567890,
        title: groupTitle,
        type: 'supergroup',
      },
      from: {
        id: 987654321,
        is_bot: false,
        first_name: senderName.split(' ')[0] || 'Тестер',
        last_name: senderName.split(' ')[1] || '',
        username: 'test_user',
      },
      text: text,
    },
  };

  addLog('info', `Запущена симуляция входящего сообщения из группы «${groupTitle}»`);

  if (myChatId && currentBot) {
    try {
      const header = `🧪 <b>[СИМУЛЯЦИЯ] Сообщение из группы:</b> ${escapeHtml(groupTitle)}\n👤 <b>Автор:</b> ${escapeHtml(senderName)} (@test_user)\n\n💬 ${escapeHtml(text)}`;
      await currentBot.telegram.sendMessage(myChatId, header, { parse_mode: 'HTML' });
      addLog('success', `Симулированное сообщение успешно отправлено в ваш Telegram (ID ${myChatId})`);
    } catch (err: any) {
      addLog('warn', `Не удалось отправить симулированное сообщение в Telegram: ${err.message}`);
    }
  }

  const recordedItem: StoredMessage = {
    id: `msg_sim_${Date.now()}`,
    telegramMessageId: fakeMessageUpdate.message.message_id,
    date: Date.now(),
    sourceChat: {
      id: fakeMessageUpdate.message.chat.id,
      title: groupTitle,
      type: 'supergroup',
    },
    sender: {
      id: fakeMessageUpdate.message.from.id,
      firstName: fakeMessageUpdate.message.from.first_name,
      lastName: fakeMessageUpdate.message.from.last_name,
      username: fakeMessageUpdate.message.from.username,
    },
    messageType: 'text',
    text: text,
    forwardMethod: 'simulated',
    status: 'success',
    timestamp: new Date().toISOString(),
  };

  messagesHistory.unshift(recordedItem);
  res.json({ success: true, message: recordedItem });
});

// Inbound Webhook Handlers
app.post(['/api/telegram-webhook', '/api/bot'], async (req, res) => {
  try {
    addLog('info', `Получен входящий POST-запрос на Webhook (Update ID: ${req.body?.update_id || 'N/A'})`);

    if (currentBot) {
      await currentBot.handleUpdate(req.body, res);
      if (!res.headersSent) {
        res.status(200).json({ ok: true });
      }
    } else {
      addLog('warn', 'Получен вебхук, но экземпляр бота не инициализирован');
      res.status(200).json({ ok: true, note: 'bot not initialized' });
    }
  } catch (err: any) {
    addLog('error', `Ошибка в обработчике вебхука: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

app.get(['/api/telegram-webhook', '/api/bot'], (req, res) => {
  res.status(200).send('Telegram Forwarder Bot Server Webhook is active and healthy!');
});

// Messages and Logs History APIs
app.get('/api/messages', (req, res) => {
  res.json({
    total: messagesHistory.length,
    messages: messagesHistory,
  });
});

app.delete('/api/messages', (req, res) => {
  messagesHistory.length = 0;
  addLog('info', 'История пересланных сообщений очищена');
  res.json({ success: true });
});

app.get('/api/logs', (req, res) => {
  res.json({
    total: serverLogs.length,
    logs: serverLogs,
  });
});

app.delete('/api/logs', (req, res) => {
  serverLogs.length = 0;
  res.json({ success: true });
});

// Start Server and Mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram Bot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
