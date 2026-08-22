import React, { useState } from 'react';
import { ServerLog } from '../types';
import { Terminal, Trash2, Filter, Clock, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ServerLogsPanelProps {
  logs: ServerLog[];
  onClearLogs: () => void;
}

export const ServerLogsPanel: React.FC<ServerLogsPanelProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'success':
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex items-center gap-1 font-mono text-[10px]">
            <CheckCircle2 className="w-2.5 h-2.5" /> SUCCESS
          </span>
        );
      case 'warn':
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/50 flex items-center gap-1 font-mono text-[10px]">
            <AlertTriangle className="w-2.5 h-2.5" /> WARN
          </span>
        );
      case 'error':
        return (
          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/50 flex items-center gap-1 font-mono text-[10px]">
            <AlertCircle className="w-2.5 h-2.5" /> ERROR
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50 flex items-center gap-1 font-mono text-[10px]">
            <Info className="w-2.5 h-2.5" /> INFO
          </span>
        );
    }
  };

  return (
    <div id="server-logs-panel" className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            Системный журнал событий сервера
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Логи входящих Webhook POST-запросов, методов Telegraf и сетевых операций в реальном времени.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent text-neutral-300 focus:outline-none text-xs"
            >
              <option value="all">Все уровни ({logs.length})</option>
              <option value="info">INFO</option>
              <option value="success">SUCCESS</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>
          </div>

          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              title="Очистить журнал"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl p-4 font-mono text-xs shadow-2xl max-h-[500px] overflow-y-auto space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 italic">Журнал пуст. Новые события появятся здесь автоматически.</div>
        ) : (
          filteredLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div key={log.id} className="flex items-start gap-2.5 py-1 border-b border-neutral-900/80 hover:bg-neutral-900/40 px-1 rounded transition-colors">
                <span className="text-neutral-400 shrink-0 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {time}
                </span>
                <span className="shrink-0">{getLevelBadge(log.level)}</span>
                <div className="flex-1 text-neutral-200 break-words leading-relaxed">
                  {log.message}
                  {log.details && (
                    <span className="block mt-0.5 text-neutral-400 text-[11px]">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
