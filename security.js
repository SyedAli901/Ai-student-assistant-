const Security = (() => {
  function sanitizeHTML(str) { if(!str||typeof str!=='string') return ''; const d=document.createElement('div'); d.textContent=str; return d.innerHTML; }
  function sanitizeInput(i) { if(typeof i!=='string') return ''; return i.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/\//g,'&#x2F;').trim(); }
  function sanitizeForAI(t) { if(!t||typeof t!=='string') return ''; return t.replace(/ignore previous instructions?/gi,'[filtered]').replace(/you are now/gi,'[filtered]').replace(/system prompt/gi,'[filtered]').replace(/\[INST\]|\[\/INST\]/g,'').replace(/###\s*System/gi,'').slice(0,APP_CONFIG.api.maxPromptLength).trim(); }
  const rateLimits={};
  function checkRateLimit(action,maxCalls=null,windowMs=60000) {
    const limit = maxCalls||APP_CONFIG.rateLimits[action]||15;
    const now=Date.now();
    if(!rateLimits[action]) rateLimits[action]=[];
    rateLimits[action]=rateLimits[action].filter(t=>now-t<windowMs);
    if(rateLimits[action].length>=limit) {
      const waitSec=Math.ceil((windowMs-(now-rateLimits[action][0]))/1000);
      return {allowed:false,waitSec:Math.max(1,waitSec)};
    }
    rateLimits[action].push(now);
    return {allowed:true,waitSec:0};
  }
  function validateApiKey(k) { if(!k||typeof k!=='string') return false; return k.startsWith('AIza')||k.startsWith('gsk_')||k.startsWith('hf_'); }
  function maskKey(k) { if(!k||k.length<8) return '***'; return k.slice(0,6)+'...'+k.slice(-4); }
  const BLOCKED_PATTERNS=[/how to (make|build|create) (a |a )?(bomb|weapon|explosive)/i,/suicide|self[-.]?harm/i,/hack into|ddos|malware/i,/illegal drug/i,/bypass security/i];
  function isContentSafe(t) { if(!t||typeof t!=='string') return true; for(const p of BLOCKED_PATTERNS) if(p.test(t)) return false; return true; }
  function validateFile(file) {
    if(!file) return {valid:false,reason:'No file'};
    if(file.size>APP_CONFIG.file.maxSizeBytes) return {valid:false,reason:`Exceeds ${APP_CONFIG.file.maxSizeMB}MB limit`};
    const stats=DB.getStats();
    const usedMB=parseFloat(stats.mbUsed);
    if(usedMB + file.size/1048576 > APP_CONFIG.file.maxStorageMB) return {valid:false,reason:`Storage near full (${usedMB.toFixed(1)}MB/${APP_CONFIG.file.maxStorageMB}MB)`};
    const ext=file.name.split('.').pop().toLowerCase();
    if(!APP_CONFIG.file.allowedTypes.includes(ext)) return {valid:false,reason:`Type .${ext} not allowed`};
    return {valid:true};
  }
  function safeRender(t) {
    if(!t||typeof t!=='string') return '';
    let h=sanitizeHTML(t);
    h=h.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`(.*?)`/g,'<code style="background:var(--surface2);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:13px">$1</code>').replace(/^[-•]\s(.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
    return '<p>'+h+'</p>';
  }
  function checkStorageHealth() {
    const usedMB=parseFloat(DB.getStats().mbUsed);
    if(usedMB>=APP_CONFIG.storage.criticalThresholdMB) return {healthy:false,level:'critical',usedMB};
    if(usedMB>=APP_CONFIG.storage.warningThresholdMB) return {healthy:true,level:'warning',usedMB};
    return {healthy:true,level:'good',usedMB};
  }
  return { sanitizeHTML, sanitizeInput, sanitizeForAI, checkRateLimit, validateApiKey, maskKey, isContentSafe, validateFile, safeRender, checkStorageHealth };
})();
window.Security = Security;