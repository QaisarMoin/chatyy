// Persistent logger using Chrome storage
export const persistentLogger = {
  logs: [] as string[],
  maxLogs: 1000, // Maximum number of logs to keep

  addLog: (type: 'log' | 'error' | 'warn', message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type === 'error' ? '❌' : type === 'warn' ? '⚠️' : ''} ${message} ${args.length ? JSON.stringify(args) : ''}`;

    // Add to in-memory logs
    persistentLogger.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (persistentLogger.logs.length > persistentLogger.maxLogs) {
      persistentLogger.logs = persistentLogger.logs.slice(-persistentLogger.maxLogs);
    }

    // Store in Chrome storage
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ 'youtube-handler-logs': persistentLogger.logs });
    }

    // Also log to console
    switch (type) {
      case 'error':
        console.error(`[${timestamp}] ❌ ${message}`, ...args);
        break;
      case 'warn':
        console.warn(`[${timestamp}] ⚠️ ${message}`, ...args);
        break;
      default:
        console.log(`[${timestamp}] ${message}`, ...args);
    }
  },

  log: (message: string, ...args: any[]) => {
    persistentLogger.addLog('log', message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    persistentLogger.addLog('error', message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    persistentLogger.addLog('warn', message, ...args);
  },

  // Function to retrieve logs
  getLogs: async (): Promise<string[]> => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      const result = await chrome.storage.local.get('youtube-handler-logs');
      return result['youtube-handler-logs'] || [];
    }
    return persistentLogger.logs;
  },

  // Function to clear logs
  clearLogs: async () => {
    persistentLogger.logs = [];
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      await chrome.storage.local.remove('youtube-handler-logs');
    }
  }
}; 