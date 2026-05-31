const Monitor = (() => {
  const MAX_LOGS=200, STORE='studyai_monitor_logs';
  const stats={requests:0,errors:0,tokensIn:0,tokensOut:0};
  const LEVEL={INFO:'INFO',WARN:'WARN',ERROR:'ERROR',API:'API'};
  function _log(level,message,data=null) {
    const entry={id:Date.now(),level,message,data:data?JSON.stringify(data).slice(0,500):null,timestamp:new Date().toISOString(),url:location.href};
    const style={INFO:'color:#3ecfff',WARN:'color:#ffc542',ERROR:'color:#ff5252',API:'color:#38e2a4'};
    console.log(`%c[StudyAI ${level}] ${message}`,style[level]||'',data||'');
    try{
      let logs=JSON.parse(localStorage.getItem(STORE)||'[]');
      logs.push(entry);
      if(logs.length>MAX_LOGS) logs=logs.slice(-MAX_LOGS);
      localStorage.setItem(STORE,JSON.stringify(logs));
    }catch(e){}
    _updateStatus(level,message);
    return entry;
  }
  function _updateStatus(level,msg) {
    const dot=document.getElementById('statusDot'), txt=document.getElementById('statusText');
    if(!dot||!txt) return;
    if(level===LEVEL.ERROR) { dot.className='status-dot error'; txt.textContent='Error'; setTimeout(()=>{ dot.className='status-dot'; txt.textContent='Ready'; },4000); }
    else if(level===LEVEL.API) { dot.className='status-dot busy'; txt.textContent='Thinking...'; }
  }
  function info(m,d){return _log(LEVEL.INFO,m,d);}
  function warn(m,d){return _log(LEVEL.WARN,m,d);}
  function error(m,d){stats.errors++; return _log(LEVEL.ERROR,m,d);}
  function logRequest(provider,status){stats.requests++; _log(status>=200&&status<300?LEVEL.API:LEVEL.ERROR,`${provider}: HTTP ${status}`);}
  function logTokens(promptTokens,completionTokens){stats.tokensIn+=promptTokens||0; stats.tokensOut+=completionTokens||0; _log(LEVEL.API,`Tokens: ${promptTokens} in / ${completionTokens} out`);}
  function ready(){const d=document.getElementById('statusDot'),t=document.getElementById('statusText'); if(d) d.className='status-dot'; if(t) t.textContent='Ready';}
  function busy(msg='Working...'){const d=document.getElementById('statusDot'),t=document.getElementById('statusText'); if(d) d.className='status-dot busy'; if(t) t.textContent=msg;}
  function getLogs(){try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return[];}}
  function getStats(){return{...stats,logCount:getLogs().length};}
  function clearLogs(){localStorage.removeItem(STORE); _log(LEVEL.INFO,'Logs cleared');}
  function exportLogs(){const blob=new Blob([JSON.stringify(getLogs(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`studyai-logs-${Date.now()}.json`; a.click(); URL.revokeObjectURL(blob);}
  window.addEventListener('error',e=>error(`Uncaught: ${e.message}`,{file:e.filename,line:e.lineno}));
  window.addEventListener('unhandledrejection',e=>error(`Unhandled Promise: ${e.reason}`));
  return {info,warn,error,logRequest,logTokens,ready,busy,getLogs,getStats,clearLogs,exportLogs};
})();
window.Monitor = Monitor;