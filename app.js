const APP_CONFIG = {
  file: {
    maxSizeMB: 10,
    maxSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['pdf', 'txt', 'md', 'docx'],
    maxFilesTotal: 15,
    maxStorageMB: 8,
    truncateAtKB: 200,
    truncateAtChars: 200000
  },
  storage: {
    maxMessages: 500,
    maxLogEntries: 200,
    warningThresholdMB: 7,
    criticalThresholdMB: 9
  },
  api: {
    maxTokens: 1024,
    maxPromptLength: 4000,
    contextWindow: 3000,
    timeout: 30000
  },
  rateLimits: {
    chat: 15,
    summarize: 10,
    upload: 5
  },
  pdf: {
    maxPages: 200,
    maxExtractedMB: 5,
    pageBatch: 20
  },
  performance: {
    enableCompression: true,
    debounceDelay: 300
  }
  
};
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.file);
Object.freeze(APP_CONFIG.storage);
Object.freeze(APP_CONFIG.api);
Object.freeze(APP_CONFIG.rateLimits);
Object.freeze(APP_CONFIG.pdf);
console.log('✅ Config loaded:', APP_CONFIG.file.maxSizeMB + 'MB max file size');
window.APP_CONFIG = APP_CONFIG;