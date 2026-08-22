export interface BotConfig {
  hasToken: boolean;
  botTokenMasked: string;
  botToken?: string;
  myChatId: string;
  mode: 'webhook' | 'polling' | 'idle';
  webhookUrl: string;
  serverUrl: string;
  isConfigured: boolean;
}

export interface ForwardedMessage {
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

export interface BotInfo {
  id?: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface WebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  ip_address?: string;
}

export interface ServerLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}
