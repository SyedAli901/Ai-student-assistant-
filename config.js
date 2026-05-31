window.addEventListener('DOMContentLoaded', () => {
  Monitor.info('App starting...');
  initAPIKey();
  initTTS();
  initSettings();
  loadSavedFiles();
  Monitor.ready();
});
function initAPIKey(){
  if(!API.hasAnyKey()) showAPIKeyModal();
  else Monitor.info('Active providers: '+API.getProviderList().filter(p=>p.hasKey).map(p=>p.name).join(', '));
  injectStrategySelector();
  injectSettingsBtn();
}
function injectStrategySelector(){
  const footer=document.querySelector('.sidebar-footer');
  if(!footer||document.getElementById('strategySelect')) return;
  const wrap=document.createElement('div');
  wrap.style.cssText='padding:12px 20px 0;border-top:1px solid var(--border);margin-top:8px;';
  wrap.innerHTML=`<div style="font-size:10px;letter-spacing:.2em;color:var(--muted);font-family:var(--mono);margin-bottom:8px;">AI Strategy</div>
    <select id="strategySelect" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:8px;font-size:12px;cursor:pointer;">
      <option value="smart">🎯 Smart Route</option><option value="fallback">🔗 Fallback Chain</option><option value="verify">✅ Cross-Verify</option>
    </select>`;
  footer.parentNode.insertBefore(wrap,footer);
  const sel=document.getElementById('strategySelect');
  if(sel){ sel.value=API.getStrategy(); sel.addEventListener('change',e=>{ API.setStrategy(e.target.value); showToast('Strategy: '+e.target.options[e.target.selectedIndex].text,'success'); }); }
}
function injectSettingsBtn(){
  const topbar=document.querySelector('.topbar');
  if(!topbar||document.getElementById('settingsBtn')) return;
  const btn=document.createElement('button');
  btn.id='settingsBtn';
  btn.innerHTML='⚙️ Keys';
  btn.style.cssText='background:var(--surface2);border:1px solid var(--border);color:var(--muted2);padding:7px 14px;border-radius:8px;font-size:13px;cursor:pointer;';
  btn.onmouseover=()=>{ btn.style.color='var(--accent)'; btn.style.borderColor='var(--accent)'; };
  btn.onmouseout=()=>{ btn.style.color='var(--muted2)'; btn.style.borderColor='var(--border)'; };
  btn.onclick=()=>showAPIKeyModal();
  topbar.appendChild(btn);
}
function showAPIKeyModal(){
  if(document.getElementById('apiModal')) return;
  const providers=API.getProviderList();
  const rows=providers.map(p=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><div><span style="font-weight:600;">${p.name}</span><span style="font-size:11px;color:var(--muted);margin-left:8px;">${p.dailyLimit.toLocaleString()} req/day</span></div>
    <span id="badge_${p.id}" style="font-size:11px;padding:3px 10px;border-radius:5px;background:${p.hasKey?'rgba(56,226,164,0.15)':'rgba(107,114,128,0.15)'};color:${p.hasKey?'var(--accent3)':'var(--muted)'};">${p.hasKey?'✓ Set':'Not set'}</span></div>
    <div style="display:flex;gap:8px;"><input type="password" id="key_${p.id}" placeholder="${p.keyPrefix?p.keyPrefix+'...':'paste key'}" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:9px 12px;border-radius:8px;">
    <button onclick="saveOneKey('${p.id}')" style="background:var(--surface);border:1px solid var(--border);color:var(--muted2);padding:9px 14px;border-radius:8px;cursor:pointer;">Test & Save</button></div>
    <div style="margin-top:6px;"><a href="${p.signupUrl}" target="_blank" style="color:var(--accent);font-size:11px;">🔗 Get free key → ${p.signupUrl.split('/')[2]}</a></div></div>`).join('');
  const modal=document.createElement('div');
  modal.id='apiModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(13,15,24,0.96);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
  modal.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;"><div style="font-size:28px;">🔑</div><button onclick="closeKeyModal()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;">✕</button></div>
    <h2 style="margin-bottom:6px;">AI Provider Keys</h2><p style="color:var(--muted2);margin-bottom:20px;">Add at least 1 key (Gemini recommended). Stored locally.</p>
    ${rows}<button onclick="closeKeyModal()" style="width:100%;margin-top:8px;padding:13px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:10px;color:#fff;font-weight:600;cursor:pointer;">✓ Done</button>
    <p style="color:var(--muted);font-size:11px;text-align:center;margin-top:10px;">Need at least 1 key.</p></div>`;
  document.body.appendChild(modal);
}
async function saveOneKey(providerId){
  const input=document.getElementById('key_'+providerId);
  const key=input?.value?.trim();
  if(!key){ showToast('Paste a full API key','error'); return; }
  showToast('Testing...','');
  const valid=await API.testProviderKey(providerId,key);
  if(!valid){ showToast(`❌ ${providerId} key failed`,'error'); return; }
  API.saveProviderKey(providerId,key);
  const badge=document.getElementById('badge_'+providerId);
  if(badge){ badge.textContent='✓ Set'; badge.style.background='rgba(56,226,164,0.15)'; badge.style.color='var(--accent3)'; }
  showToast(`✅ ${providerId} key saved!`,'success');
}
function closeKeyModal(){
  if(!API.hasAnyKey()){ showToast('Add at least one API key','error'); return; }
  document.getElementById('apiModal')?.remove();
  showToast('✅ Ready!','success');
}
const TABS={chat:'Ask Questions',upload:'Upload Notes',summary:'Summarize',tts:'Listen (TTS)'};
function switchTab(tab){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+tab)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById('pageTitle').textContent=TABS[tab]||tab;
  Monitor.info('Tab: '+tab);
}
function toggleSidebar(){ document.getElementById('sidebar')?.classList.toggle('open'); }
async function sendQuestion(){
  const input=document.getElementById('chatInput');
  const raw=input?.value?.trim();
  if(!raw) return;
  const clean=Security.sanitizeForAI(raw);
  if(!Security.isContentSafe(clean)){ showError('Content not allowed'); return; }
  const limit=Security.checkRateLimit('chat',15,60000);
  if(!limit.allowed){ showError(`Too many requests. Wait ${limit.waitSec}s.`); return; }
  if(!API.hasAnyKey()){ showAPIKeyModal(); return; }
  appendMessage('user',clean);
  input.value='';
  autoResize(input);
  DB.saveMessage('user',clean);
  const typingId=appendTyping();
  const sendBtn=document.getElementById('sendBtn');
  if(sendBtn) sendBtn.disabled=true;
  Monitor.busy('Thinking...');
  try{
    const context=DB.getAllFilesText();
    const answer=await API.askQuestion(clean,context.slice(0,APP_CONFIG.api.contextWindow));
    removeTyping(typingId);
    appendMessage('ai',answer.full||answer.text);
    DB.saveMessage('assistant',answer.full||answer.text);
    checkSystemHealth();
  }catch(err){
    removeTyping(typingId);
    Monitor.error(err.message);
    showError(err.message);
    appendMessage('ai','⚠️ Error: '+err.message);
  }finally{
    if(sendBtn) sendBtn.disabled=false;
    Monitor.ready();
  }
}
function handleChatKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendQuestion(); } }
function autoResize(el){ if(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,140)+'px'; } }
function appendMessage(role,content){
  const win=document.getElementById('chatWindow');
  if(!win) return;
  const welcome=win.querySelector('.chat-welcome');
  if(welcome) welcome.remove();
  const msg=document.createElement('div');
  msg.className=`msg ${role}`;
  if(role==='ai'){
    msg.innerHTML=Security.safeRender(content);
    const actions=document.createElement('div');
    actions.className='msg-actions';
    actions.innerHTML='<button class="copy-msg-btn">📋 Copy</button><button class="listen-msg-btn">🔊 Listen</button>';
    actions.querySelector('.copy-msg-btn').addEventListener('click',()=>copyText(content));
    actions.querySelector('.listen-msg-btn').addEventListener('click',()=>listenText(content));
    msg.appendChild(actions);
  }else msg.textContent=content;
  win.appendChild(msg);
  win.scrollTo({top:win.scrollHeight,behavior:'smooth'});
}
function appendTyping(){
  const id='typing_'+Date.now();
  const win=document.getElementById('chatWindow');
  if(!win) return id;
  const msg=document.createElement('div');
  msg.className='msg ai typing';
  msg.id=id;
  msg.innerHTML='<div class="dots"><span></span><span></span><span></span></div>';
  win.appendChild(msg);
  win.scrollTo({top:win.scrollHeight,behavior:'smooth'});
  return id;
}
function removeTyping(id){ document.getElementById(id)?.remove(); }
function copyText(text){ if(text) navigator.clipboard.writeText(text).then(()=>showToast('Copied!','success')); }
function listenText(text){ if(text){ switchTab('tts'); const inp=document.getElementById('ttsInput'); if(inp){ inp.value=text; setTimeout(()=>ttsPlay(),300); } } }
function handleDragOver(e){ e.preventDefault(); document.getElementById('uploadZone')?.classList.add('drag-over'); }
function handleDragLeave(){ document.getElementById('uploadZone')?.classList.remove('drag-over'); }
function handleDrop(e){ e.preventDefault(); document.getElementById('uploadZone')?.classList.remove('drag-over'); const file=e.dataTransfer?.files?.[0]; if(file) processFile(file); }
function handleFileSelect(e){ const file=e.target?.files?.[0]; if(file) processFile(file); }
async function processFile(file){
  const check=Security.validateFile(file);
  if(!check.valid){ showError(check.reason); return; }
  Monitor.busy('Reading...');
  try{
    const text=await AIService.extractTextFromFile(file);
    const saved=DB.saveFile(file.name,text,file.size);
    renderFileCard(saved);
    showToast(`✅ "${file.name}" uploaded`,'success');
    checkSystemHealth();
  }catch(err){ Monitor.error(err.message); showError('Failed: '+err.message); }
  finally{ Monitor.ready(); }
}
function renderFileCard(f){
  const list=document.getElementById('uploadedList');
  if(!list) return;
  const card=document.createElement('div');
  card.className='file-card';
  card.id='file_'+f.id;
  const ext=f.name.split('.').pop().toUpperCase();
  const icon=ext==='PDF'?'📕':ext==='MD'?'📝':'📄';
  const kb=(f.size/1024).toFixed(1);
  card.innerHTML=`<span class="file-icon">${icon}</span><div class="file-info"><div class="file-name">${Security.sanitizeHTML(f.name)}</div><div class="file-meta">${kb} KB · ${f.chars.toLocaleString()} chars</div></div><div class="file-actions"><button onclick="deleteFile('${f.id}')">🗑 Remove</button></div>`;
  list.appendChild(card);
}
function deleteFile(id){
  DB.deleteFile(id);
  document.getElementById('file_'+id)?.remove();
  showToast('File removed','info');
  checkSystemHealth();
}
function loadSavedFiles(){ DB.getFiles().forEach(f=>renderFileCard(f)); }
async function summarizeText(){
  const input=document.getElementById('summaryInput')?.value?.trim();
  if(!input){ showError('Paste text to summarize'); return; }
  const limit=Security.checkRateLimit('summarize',10,60000);
  if(!limit.allowed){ showError(`Wait ${limit.waitSec}s`); return; }
  if(!API.hasAnyKey()){ showAPIKeyModal(); return; }
  const style=document.getElementById('summaryStyle')?.value||'bullets';
  const clean=Security.sanitizeForAI(input);
  const btn=document.getElementById('sumBtn');
  if(btn) btn.disabled=true;
  Monitor.busy('Summarizing...');
  try{
    const result=await API.summarize(clean,style);
    const outDiv=document.getElementById('summaryResult');
    if(outDiv) outDiv.innerHTML=Security.safeRender(result.full||result.text);
    document.getElementById('summaryOutput').style.display='block';
  }catch(err){ Monitor.error(err.message); showError(err.message); }
  finally{ if(btn) btn.disabled=false; Monitor.ready(); }
}
function useUploadedNotes(){
  const all=DB.getAllFilesText();
  if(!all){ showError('No uploaded notes'); return; }
  const inp=document.getElementById('summaryInput');
  if(inp) inp.value=all.slice(0,8000);
  showToast('Notes loaded','success');
}
function copySummary(){ const t=document.getElementById('summaryResult')?.innerText; if(t) navigator.clipboard.writeText(t).then(()=>showToast('Copied!','success')); }
function listenSummary(){ const t=document.getElementById('summaryResult')?.innerText; if(t){ switchTab('tts'); const inp=document.getElementById('ttsInput'); if(inp){ inp.value=t; setTimeout(()=>ttsPlay(),300); } } }
async function initTTS(){
  if(!AIService.isTTSSupported()){ Monitor.warn('TTS not supported'); return; }
  const voices=await AIService.loadVoices();
  const sel=document.getElementById('voiceSelect');
  if(sel && voices.length){
    voices.forEach(v=>{ const opt=document.createElement('option'); opt.value=v.name; opt.textContent=`${v.name} (${v.lang})`; if(v.default) opt.selected=true; sel.appendChild(opt); });
  }
  const rateRange=document.getElementById('rateRange'), rateVal=document.getElementById('rateVal');
  if(rateRange && rateVal) rateRange.addEventListener('input',e=>{ rateVal.textContent=parseFloat(e.target.value).toFixed(1)+'x'; });
  const pitchRange=document.getElementById('pitchRange'), pitchVal=document.getElementById('pitchVal');
  if(pitchRange && pitchVal) pitchRange.addEventListener('input',e=>{ pitchVal.textContent=parseFloat(e.target.value).toFixed(1); });
}
function ttsPlay(){
  const text=document.getElementById('ttsInput')?.value?.trim();
  if(!text){ showError('Enter text to read'); return; }
  const state=AIService.getTTSState();
  if(state==='paused'){ AIService.resumeSpeak(); updateTTSButtons('playing'); return; }
  const options={ rate:parseFloat(document.getElementById('rateRange')?.value||1), pitch:parseFloat(document.getElementById('pitchRange')?.value||1), voice:document.getElementById('voiceSelect')?.value };
  AIService.speak(text,options,{ onStart:()=>{ updateTTSButtons('playing'); document.getElementById('ttsProgress').style.display='block'; animateProgress(); }, onEnd:()=>{ updateTTSButtons('stopped'); const fill=document.getElementById('progressFill'); if(fill) fill.style.width='100%'; setTimeout(()=>{ document.getElementById('ttsProgress').style.display='none'; if(fill) fill.style.width='0%'; },800); }, onError:(e)=>{ Monitor.error('TTS error'); updateTTSButtons('stopped'); showError('TTS error'); } });
}
function animateProgress(){
  const fill=document.getElementById('progressFill');
  if(!fill) return;
  let w=0;
  const int=setInterval(()=>{ if(AIService.getTTSState()!=='playing'){ clearInterval(int); return; } w+=2; if(w>=100) clearInterval(int); fill.style.width=w+'%'; },200);
}
function ttsPause(){ AIService.pauseSpeak(); updateTTSButtons('paused'); }
function ttsStop(){ AIService.stopSpeak(); updateTTSButtons('stopped'); document.getElementById('ttsProgress').style.display='none'; const fill=document.getElementById('progressFill'); if(fill) fill.style.width='0%'; }
function updateTTSButtons(state){
  const play=document.getElementById('ttsPlayBtn'), pause=document.getElementById('ttsPauseBtn'), stop=document.getElementById('ttsStopBtn'), status=document.getElementById('ttsStatus');
  if(!play) return;
  if(state==='playing'){ play.textContent='▶ Playing...'; play.disabled=true; if(pause) pause.disabled=false; if(stop) stop.disabled=false; if(status) status.textContent='Reading...'; }
  else if(state==='paused'){ play.textContent='▶ Resume'; play.disabled=false; if(pause) pause.disabled=true; if(stop) stop.disabled=false; if(status) status.textContent='Paused'; }
  else{ play.textContent='▶ Play'; play.disabled=false; if(pause) pause.disabled=true; if(stop) stop.disabled=true; if(status) status.textContent='Ready'; }
}
function initSettings(){ Monitor.info('DB stats: '+JSON.stringify(DB.getStats())); }
function showError(msg){
  const banner=document.getElementById('errorBanner'), msgEl=document.getElementById('errorMsg');
  if(banner && msgEl){ msgEl.textContent='⚠️ '+msg; banner.style.display='flex'; setTimeout(()=>{ banner.style.display='none'; },5000); }
  Monitor.error(msg);
}
function closeError(){ const b=document.getElementById('errorBanner'); if(b) b.style.display='none'; }
function showToast(msg,type=''){
  const existing=document.querySelector('.toast'); if(existing) existing.remove();
  const toast=document.createElement('div'); toast.className=`toast ${type}`; toast.textContent=msg; document.body.appendChild(toast); setTimeout(()=>toast.remove(),3000);
}
function checkSystemHealth(){
  const health=Security.checkStorageHealth();
  const stats=DB.getStats();
  if(health.level==='critical') showError(`⚠️ Storage nearly full (${stats.mbUsed}MB). Delete files!`);
  else if(health.level==='warning') showToast(`📊 Storage: ${stats.mbUsed}MB used`,'info');
  return health;
}
window.checkSystemHealth=checkSystemHealth;