import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config file path for persistent settings
const CONFIG_FILE = path.join(process.cwd(), 'bot_config.json');

// Default / Initial Settings
let botToken: string = process.env.BOT_TOKEN || '8988916261:AAF1b0yLepEVgdUPSike9NsENbWuTlHc4wc';
let myChatId: string = process.env.MY_CHAT_ID || '';
let botMode: 'webhook' | 'polling' | 'idle' = botToken ? 'polling' : 'idle';
let currentBot: Telegraf | null = null;
let isPollingRunning = false;
let watchedKeywords: string[] = ['срочно', 'важно', 'цена', 'заказ', 'купить', 'помощь', 'клиент'];
let forwardAllMessages = true;
let notifyOnKeyword = true;

// Load persisted configuration from disk if exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const saved = JSON.parse(raw);
    if (saved.botToken) botToken = saved.botToken;
    if (saved.myChatId) myChatId = saved.myChatId;
    if (Array.isArray(saved.watchedKeywords)) watchedKeywords = saved.watchedKeywords;
    if (typeof saved.forwardAllMessages === 'boolean') forwardAllMessages = saved.forwardAllMessages;
    if (typeof saved.notifyOnKeyword === 'boolean') notifyOnKeyword = saved.notifyOnKeyword;
    console.log('[CONFIG] Successfully loaded saved settings from bot_config.json');
  }
} catch (e: any) {
  console.error('[CONFIG] Failed to read bot_config.json:', e.message);
}

function saveConfigToDisk() {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          botToken,
          myChatId,
          watchedKeywords,
          forwardAllMessages,
          notifyOnKeyword,
        },
        null,
        2
      ),
      'utf-8'
    );
    console.log('[CONFIG] Settings successfully saved to bot_config.json');
  } catch (e: any) {
    console.error('[CONFIG] Failed to save bot_config.json:', e.message);
  }
}

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
  matchedKeywords?: string[];
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

// Keyword detection helper
function detectMatchedKeywords(text: string, keywords: string[]): string[] {
  if (!text || !keywords || keywords.length === 0) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const kw of keywords) {
    const trimmed = kw.trim().toLowerCase();
    if (!trimmed) continue;
    // Check if substring or word match
    if (lower.includes(trimmed)) {
      matched.push(kw.trim());
    }
  }
  return matched;
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

    // If message is in private chat with ourself, process and acknowledge it!
    const isPrivateSelfChat = chat && myChatId && chat.id.toString() === myChatId.toString();
    if (isPrivateSelfChat) {
      addLog('info', `Получено личное тестовое сообщение от вас (Chat ID ${chat.id}): "${text || msgType}"`);
      // Reply back with confirmation so the user sees the bot is alive
      if (text && !text.startsWith('/')) {
        try {
          await ctx.reply(`✅ <b>Бот вас слышит!</b>\n\nВы написали: <i>${escapeHtml(text)}</i>\n\nБот активен и готов к работе.`, { parse_mode: 'HTML' });
        } catch (e: any) {
          console.error('Error replying in self chat:', e);
        }
      }
    }

    const title = chat?.title || `${chat?.first_name || ''} ${chat?.last_name || ''}`.trim() || 'Чат';
    const senderName = from.username
      ? `@${from.username}`
      : `${from.first_name || ''} ${from.last_name || ''}`.trim() || `User ${from.id}`;

    // Detect matched keywords
    const matchedKeywords = detectMatchedKeywords(text, watchedKeywords);
    const hasKeywordMatch = matchedKeywords.length > 0;

    // Check if we should forward
    // If forwardAllMessages is false, only forward when there's a keyword match
    const shouldForward = forwardAllMessages || hasKeywordMatch;

    addLog(
      hasKeywordMatch ? 'warn' : 'info',
      `${hasKeywordMatch ? '🚨 [КЛЮЧЕВОЕ СЛОВО: ' + matchedKeywords.join(', ') + ']' : 'Получено'} сообщение из «${title}» (${chat?.id}) от ${senderName}: ${text ? text.slice(0, 50) : `[${msgType}]`}`
    );

    let forwardMethod: 'forwardMessage' | 'copyMessage' | 'simulated' = 'forwardMessage';
    let forwardStatus: 'success' | 'failed' = 'success';
    let errorMessage: string | undefined = undefined;

    if (isPrivateSelfChat) {
      // Don't forward to self, message was already answered directly
      forwardStatus = 'success';
      forwardMethod = 'simulated';
    } else if (!shouldForward) {
      addLog('info', `Сообщение пропущено: нет совпадений по ключевым словам (${watchedKeywords.join(', ')})`);
      forwardStatus = 'success';
      forwardMethod = 'simulated';
    } else if (myChatId && currentBot) {
      try {
        // If keyword match and notifyOnKeyword is on, send an explicit HIGH PRIORITY push notification first
        if (hasKeywordMatch && notifyOnKeyword) {
          const alertBadge = `🚨 <b>ВНИМАНИЕ: СРАБОТАЛО КЛЮЧЕВОЕ СЛОВО!</b>\n` +
            `🔑 <b>Ключевые слова:</b> <code>${escapeHtml(matchedKeywords.join(', '))}</code>\n` +
            `👥 <b>Чат:</b> ${escapeHtml(title)} (<code>${chat.id}</code>)\n` +
            `👤 <b>Отправитель:</b> ${escapeHtml(senderName)} (<code>${from.id}</code>)\n\n` +
            `💬 <i>${escapeHtml(text.slice(0, 300))}${text.length > 300 ? '...' : ''}</i>`;

          await currentBot.telegram.sendMessage(myChatId, alertBadge, {
            parse_mode: 'HTML',
            disable_notification: false, // Ensure sound / push alert is triggered
          });
          addLog('success', `Отправлен срочный Push-алерт по ключевым словам: ${matchedKeywords.join(', ')}`);
        }

        // Attempt standard forwardMessage (preserves original author tag)
        await currentBot.telegram.forwardMessage(myChatId, chat.id, msg.message_id);
        forwardMethod = 'forwardMessage';
        addLog('success', `Успешно переслано (forwardMessage) в ID ${myChatId}`);
      } catch (err: any) {
        addLog('warn', `forwardMessage не удался (${err.message}). Пробуем copyMessage с заголовком...`);
        try {
          // If forward fails (e.g. protected content, restricted group), use copyMessage
          const header = `${hasKeywordMatch ? '🚨 <b>[КЛЮЧЕВОЕ СЛОВО: ' + escapeHtml(matchedKeywords.join(', ')) + ']</b>\n' : ''}📩 <b>Источник:</b> ${escapeHtml(title)} (<code>${chat.id}</code>)\n👤 <b>Автор:</b> ${escapeHtml(senderName)} (<code>${from.id}</code>)`;
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
      matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : undefined,
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

// Helper to launch polling reliably
async function ensurePollingRunning() {
  if (!currentBot || !botToken) return;
  try {
    if (isPollingRunning) {
      try {
        currentBot.stop('Restarting polling');
      } catch (e) {}
      isPollingRunning = false;
      // Brief pause to allow sockets to cleanly close
      await new Promise((r) => setTimeout(r, 200));
    }
    
    // Delete any active webhook first so Telegram allows getUpdates
    await currentBot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
    
    currentBot.launch({
      allowedUpdates: ['message', 'channel_post', 'edited_message'],
    }).catch((e: any) => {
      addLog('error', `Ошибка в процессе polling: ${e.message}`);
      isPollingRunning = false;
    });
    isPollingRunning = true;
    botMode = 'polling';
    addLog('success', '🚀 Polling запущен: бот слушает все входящие сообщения в Telegram');
  } catch (err: any) {
    addLog('error', `Не удалось запустить Polling: ${err.message}`);
  }
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
    bot.start(async (ctx) => {
      const from = ctx.from;
      const response = `👋 <b>Бот-пересыльщик активен!</b>\n\nВаш Chat ID: <code>${from.id}</code>\n\nОтправьте этот ID в настройки веб-панели (поле MY_CHAT_ID), добавьте бота в нужные группы/каналы, и бот будет пересылать все сообщения вам!`;
      try {
        await ctx.replyWithHTML(response);
        addLog('success', `Пользователь @${from.username || from.first_name} (ID: ${from.id}) запустил бота через /start`);
      } catch (e: any) {
        console.error('Error in /start reply:', e);
      }
    });

    bot.command('myid', async (ctx) => {
      try {
        await ctx.replyWithHTML(`Ваш Telegram Chat ID: <code>${ctx.chat.id}</code>`);
      } catch (e) {}
    });

    bot.on(['message', 'channel_post'], async (ctx) => {
      await handleIncomingTelegramMessage(ctx);
    });

    bot.catch((err: any, ctx: any) => {
      addLog('error', `Telegraf ошибка: ${err.message}`, { updateType: ctx?.updateType });
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
  const bot = initBotInstance(botToken);
  if (bot) {
    ensurePollingRunning();
  }
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
    keywords: watchedKeywords,
    forwardAllMessages,
    notifyOnKeyword,
  });
});

app.post('/api/config', async (req, res) => {
  const { token, chatId, keywords, forwardAll, notifyKeywords } = req.body;

  if (typeof chatId === 'string') {
    myChatId = chatId.trim();
  }

  if (typeof token === 'string' && token.trim()) {
    const trimmed = token.trim();
    if (trimmed !== botToken) {
      botToken = trimmed;
      initBotInstance(botToken);
    }
  }

  if (Array.isArray(keywords)) {
    watchedKeywords = keywords
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k) => k.length > 0);
  }

  if (typeof forwardAll === 'boolean') {
    forwardAllMessages = forwardAll;
  }

  if (typeof notifyKeywords === 'boolean') {
    notifyOnKeyword = notifyKeywords;
  }

  addLog(
    'info',
    `Настройки обновлены: Chat ID = ${myChatId || 'не задан'}, Ключевых слов: ${watchedKeywords.length}, Пересылка всех: ${forwardAllMessages ? 'Да' : 'Только по ключевым словам'}`
  );

  saveConfigToDisk();

  // If running on a public HTTPS domain (e.g. Cloud Run), auto-register Webhook for 100% reliability
  const host = req.get('host') || '';
  const isPublicDomain = host.includes('.run.app') || host.includes('.app') || host.includes('.dev') || req.get('x-forwarded-proto') === 'https';

  if (isPublicDomain && currentBot && botToken) {
    const proto = req.get('x-forwarded-proto') || 'https';
    const autoWebhookUrl = `${proto}://${host}/api/telegram-webhook`;
    try {
      if (isPollingRunning) {
        try { currentBot.stop('Switching to auto-webhook'); } catch (e) {}
        isPollingRunning = false;
      }
      await currentBot.telegram.setWebhook(autoWebhookUrl, {
        drop_pending_updates: false,
        allowed_updates: ['message', 'channel_post', 'edited_message'],
      });
      botMode = 'webhook';
      addLog('success', `⚡ Webhook автоматически привязан к облачному серверу: ${autoWebhookUrl}`);
    } catch (whErr: any) {
      addLog('warn', `Авто-привязка Webhook: ${whErr.message}. Запускаем Polling как запасной вариант.`);
      ensurePollingRunning();
    }
  } else if (currentBot && botToken) {
    ensurePollingRunning();
  }

  res.json({
    success: true,
    message: 'Настройки сохранены и бот готов к приему сообщений!',
    keywords: watchedKeywords,
    forwardAllMessages,
    notifyOnKeyword,
    botMode,
    isPolling: isPollingRunning,
  });
});

// Cached Telegram Status
let cachedTelegramStatus: any = null;
let lastStatusFetchTime = 0;
const STATUS_CACHE_TTL = 15000; // 15 seconds cache

// Telegram API Proxy & Diagnostics
app.get('/api/telegram/status', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.json({
      configured: false,
      error: 'BOT_TOKEN не задан. Введите токен в настройках.',
    });
  }

  const now = Date.now();
  const forceRefresh = req.query.force === 'true';

  if (!forceRefresh && cachedTelegramStatus && now - lastStatusFetchTime < STATUS_CACHE_TTL) {
    return res.json({
      ...cachedTelegramStatus,
      isPolling: isPollingRunning,
    });
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Telegram API timeout')), 2500)
    );

    const fetchPromise = Promise.allSettled([
      currentBot.telegram.getMe(),
      currentBot.telegram.getWebhookInfo(),
    ]);

    const result: any = await Promise.race([fetchPromise, timeoutPromise]);

    let botData = cachedTelegramStatus?.bot || null;
    let webhookData = cachedTelegramStatus?.webhook || null;
    let botError = null;
    let webhookError = null;

    if (Array.isArray(result)) {
      const [botInfo, webhookInfo] = result;
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
    }

    cachedTelegramStatus = {
      configured: true,
      bot: botData,
      webhook: webhookData,
      isPolling: isPollingRunning,
      botError,
      webhookError,
    };
    lastStatusFetchTime = Date.now();

    res.json(cachedTelegramStatus);
  } catch (err: any) {
    if (cachedTelegramStatus) {
      return res.json({
        ...cachedTelegramStatus,
        isPolling: isPollingRunning,
      });
    }
    res.json({
      configured: true,
      bot: null,
      webhook: null,
      isPolling: isPollingRunning,
      botError: 'Telegram API не ответил вовремя',
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
    return res.status(400).json({ success: false, error: 'Токен бота не настроен. Сохраните токен в настройках.' });
  }
  if (!myChatId) {
    return res.status(400).json({ success: false, error: 'MY_CHAT_ID не указан. Введите ваш Telegram ID.' });
  }

  try {
    const text = req.body.text || `🔔 <b>Тестовое сообщение от Telegram Forwarder Server</b>\n\n✅ Сервер работает штатно!\n📅 Время: <code>${new Date().toLocaleString('ru-RU')}</code>\n🔗 Режим: <code>${botMode === 'webhook' ? 'Webhook (Облачный)' : 'Long Polling'}</code>`;
    
    await currentBot.telegram.sendMessage(myChatId, text, { parse_mode: 'HTML' });
    addLog('success', `Тестовое сообщение успешно отправлено в ЛС (ID: ${myChatId})`);
    res.json({ success: true });
  } catch (err: any) {
    const errMsg = err.message || String(err);
    addLog('error', `Не удалось отправить тестовое сообщение в ID ${myChatId}: ${errMsg}`);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Full Auto-Fix and Health Verification
app.post('/api/telegram/auto-fix', async (req, res) => {
  if (!botToken || !currentBot) {
    return res.status(400).json({ success: false, error: 'Токен бота не настроен' });
  }

  const steps: { step: string; status: 'ok' | 'error' | 'skipped'; message: string }[] = [];

  // Step 1: Check Bot Token with Telegram
  try {
    const me = await currentBot.telegram.getMe();
    steps.push({
      step: 'bot_auth',
      status: 'ok',
      message: `Бот авторизован: @${me.username} (${me.first_name})`,
    });
  } catch (e: any) {
    steps.push({
      step: 'bot_auth',
      status: 'error',
      message: `Ошибка токена: ${e.message}`,
    });
    return res.json({ success: false, steps, error: 'Токен бота недействителен' });
  }

  // Step 2: Configure Webhook on public URL
  const host = req.get('host') || '';
  const proto = req.get('x-forwarded-proto') || 'https';
  const webhookUrl = `${proto}://${host}/api/telegram-webhook`;

  try {
    if (isPollingRunning) {
      try { currentBot.stop('Auto-fix switching to webhook'); } catch (e) {}
      isPollingRunning = false;
    }
    await currentBot.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: false,
      allowed_updates: ['message', 'channel_post', 'edited_message'],
    });
    botMode = 'webhook';
    steps.push({
      step: 'webhook',
      status: 'ok',
      message: `Webhook успешно привязан к: ${webhookUrl}`,
    });
    addLog('success', `[Auto-Fix] Webhook установлен на ${webhookUrl}`);
  } catch (e: any) {
    steps.push({
      step: 'webhook',
      status: 'error',
      message: `Не удалось установить Webhook: ${e.message}`,
    });
  }

  // Step 3: Test send message if chat ID configured
  if (myChatId) {
    try {
      await currentBot.telegram.sendMessage(
        myChatId,
        `🛠 <b>Авто-проверка Telegram Forwarder</b>\n\n✅ Связь с облачным сервером успешно налажена!\n⚡ Режим: <code>Webhook Active</code>\n🌐 Сервер: <code>${host}</code>`,
        { parse_mode: 'HTML' }
      );
      steps.push({
        step: 'send_test',
        status: 'ok',
        message: `Тестовое сообщение успешно доставлено в ваш Telegram (ID ${myChatId})`,
      });
      addLog('success', `[Auto-Fix] Тестовое сообщение доставлено пользователю ${myChatId}`);
    } catch (e: any) {
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
      message: 'MY_CHAT_ID не указан. Укажите ваш ID в настройках.',
    });
  }

  const allOk = steps.every((s) => s.status === 'ok' || s.status === 'skipped');
  res.json({
    success: allOk,
    steps,
    botMode,
  });
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
    const updateId = req.body?.update_id;
    addLog('info', `Получен входящий POST-запрос на Webhook (Update ID: ${updateId || 'N/A'})`);

    if (currentBot && req.body) {
      await currentBot.handleUpdate(req.body);
      if (!res.headersSent) {
        res.status(200).json({ ok: true });
      }
    } else {
      addLog('warn', 'Получен вебхук, но экземпляр бота не инициализирован');
      if (!res.headersSent) {
        res.status(200).json({ ok: true, note: 'bot not initialized' });
      }
    }
  } catch (err: any) {
    addLog('error', `Ошибка в обработчике вебхука: ${err.message}`);
    if (!res.headersSent) {
      res.status(200).json({ ok: true, error: err.message });
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
