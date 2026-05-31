const DB = (() => {
  const PREFIX = 'studyai_';
  const STORES = {
    SESSIONS: 'sessions',
    MESSAGES: 'messages',
    FILES:    'files',
    SETTINGS: 'settings',
    LOGS:     'logs'
  };
  function _key(store) { return PREFIX + store; }
  function _read(store) {
    try {
      const raw = localStorage.getItem(_key(store));
      if (!raw) return [];
      if (raw.startsWith('{compressed:')) {
        try {
          const compressed = JSON.parse(raw);
          return JSON.parse(compressed.data);
        } catch(e) { return JSON.parse(raw); }
      }
      return JSON.parse(raw);
    } catch(e) { return []; }
  }
  function _write(store, data) {
    try {
      let stringData = JSON.stringify(data);
      if (stringData.length > 102400 && APP_CONFIG.performance.enableCompression) {
        stringData = JSON.stringify({ compressed: true, data: stringData.replace(/\s+/g,' ') });
      }
      localStorage.setItem(_key(store), stringData);
      return true;
    } catch(e) { if(e.name==='QuotaExceededError') showStorageWarning(); return false; }
  }
  function showStorageWarning() {
    const w = document.createElement('div');
    w.className = 'toast error';
    w.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:1000;background:#212438;border:1px solid #ff5252;color:#ff8a80;padding:12px 20px;border-radius:10px;';
    w.innerHTML = '⚠️ Storage full! Delete some files.';
    document.body.appendChild(w);
    setTimeout(()=>w.remove(),5000);
  }
  function insert(store, record) {
    let records = _read(store);
    if(store===STORES.MESSAGES && records.length>=APP_CONFIG.storage.maxMessages) records.shift();
    if(store===STORES.LOGS && records.length>=APP_CONFIG.storage.maxLogEntries) records.shift();
    if(store===STORES.FILES && records.length>=APP_CONFIG.file.maxFilesTotal) records.shift();
    const newRecord = { id: Date.now()+'_'+Math.random().toString(36).slice(2,7), createdAt: new Date().toISOString(), ...record };
    records.push(newRecord);
    return _write(store, records) ? newRecord : null;
  }
  function getAll(store) { return _read(store); }
  function getById(store, id) { return _read(store).find(r=>r.id===id)||null; }
  function update(store, id, patch) {
    const records = _read(store).map(r=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r);
    _write(store,records);
  }
  function remove(store, id) { _write(store, _read(store).filter(r=>r.id!==id)); }
  function clear(store) { _write(store,[]); }
  function setSetting(key,value) {
    try {
      const s = JSON.parse(localStorage.getItem(_key(STORES.SETTINGS))||'{}');
      s[key]=value;
      localStorage.setItem(_key(STORES.SETTINGS),JSON.stringify(s));
    } catch(e) {}
  }
  function getSetting(key,defaultVal=null) {
    try {
      const s = JSON.parse(localStorage.getItem(_key(STORES.SETTINGS))||'{}');
      return key in s ? s[key] : defaultVal;
    } catch(e) { return defaultVal; }
  }
  function saveMessage(role,content,sessionId='default') {
    return insert(STORES.MESSAGES,{role,content:content.slice(0,10000),sessionId});
  }
  function getMessages(sessionId='default') {
    return _read(STORES.MESSAGES).filter(m=>m.sessionId===sessionId);
  }
  function clearMessages(sessionId='default') {
    const remaining = _read(STORES.MESSAGES).filter(m=>m.sessionId!==sessionId);
    _write(STORES.MESSAGES,remaining);
  }
  function saveFile(name,content,size) {
    let truncated = content;
    if(content.length > APP_CONFIG.file.truncateAtChars) {
      truncated = content.slice(0, APP_CONFIG.file.truncateAtChars) + 
        `\n\n[...truncated: Original ${(size/1024).toFixed(1)}KB, showing first ${APP_CONFIG.file.truncateAtChars} chars]`;
    }
    console.log(`💾 Saving ${name}: ${(size/1024).toFixed(1)}KB -> ${(truncated.length/1024).toFixed(1)}KB stored`);
    return insert(STORES.FILES,{name,content:truncated,size,chars:truncated.length,originalSize:size,truncated:content.length>APP_CONFIG.file.truncateAtChars});
  }
  function getFiles() { return _read(STORES.FILES); }
  function deleteFile(id) { remove(STORES.FILES,id); }
  function getAllFilesText() {
    const files = _read(STORES.FILES);
    let total=0;
    const txt = files.map(f=>{ total+=f.content.length; return `=== ${f.name} ===\n${f.content}`; }).join('\n\n');
    console.log(`📚 Loaded ${files.length} files, ${(total/1024).toFixed(1)}KB text`);
    return txt;
  }
  function getStats() {
    let bytes=0;
    for(const s of Object.values(STORES)) bytes += (localStorage.getItem(_key(s))||'').length;
    return {
      messages: _read(STORES.MESSAGES).length,
      files: _read(STORES.FILES).length,
      bytesUsed: bytes,
      kbUsed: (bytes/1024).toFixed(1),
      mbUsed: (bytes/1024/1024).toFixed(2)
    };
  }
  function cleanOldData() {
    let msgs = _read(STORES.MESSAGES);
    if(msgs.length>APP_CONFIG.storage.maxMessages) _write(STORES.MESSAGES, msgs.slice(-APP_CONFIG.storage.maxMessages));
    let fls = _read(STORES.FILES);
    if(fls.length>APP_CONFIG.file.maxFilesTotal) _write(STORES.FILES, fls.slice(-APP_CONFIG.file.maxFilesTotal));
  }
  return {
    STORES, insert, getAll, getById, update, remove, clear,
    setSetting, getSetting,
    saveMessage, getMessages, clearMessages,
    saveFile, getFiles, deleteFile, getAllFilesText,
    getStats, cleanOldData
  };
})();
window.DB = DB;