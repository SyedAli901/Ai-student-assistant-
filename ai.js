const AIService = (() => {
  async function extractTextFromFile(file) {
    const ext=file.name.split('.').pop().toLowerCase();
    const sizeMB=file.size/1048576;
    if(sizeMB>APP_CONFIG.file.maxSizeMB) throw new Error(`File too large (${sizeMB.toFixed(1)}MB). Max ${APP_CONFIG.file.maxSizeMB}MB`);
    if(ext==='txt'||ext==='md') return await readAsText(file);
    if(ext==='pdf') return await extractPDF(file);
    if(ext==='docx') return await extractDOCX(file);
    throw new Error(`Unsupported type .${ext}`);
  }
  function readAsText(file) { return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=e=>resolve(e.target.result); r.onerror=()=>reject(new Error('Read failed')); r.readAsText(file); }); }
  async function extractPDF(file) {
    const ab=await file.arrayBuffer();
    if(ab.byteLength/1048576>15) throw new Error('PDF >15MB not recommended');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:ab}).promise;
    if(pdf.numPages>APP_CONFIG.pdf.maxPages) throw new Error(`PDF has ${pdf.numPages} pages, max ${APP_CONFIG.pdf.maxPages}`);
    let full='', extracted=0;
    for(let i=1;i<=pdf.numPages;i++) {
      const page=await pdf.getPage(i);
      const txt=(await page.getTextContent()).items.map(it=>it.str).join(' ');
      full+=`[Page ${i}]\n${txt}\n\n`;
      extracted+=txt.length;
      if(extracted>APP_CONFIG.pdf.maxExtractedMB*1048576) { full+='\n[...extracted text limit]'; break; }
      if(i%APP_CONFIG.pdf.pageBatch===0) await new Promise(r=>setTimeout(r,10));
    }
    return full.trim()||'No readable text.';
  }
  async function extractDOCX(file) {
    if(typeof mammoth!=='undefined' && mammoth.extractRawText) {
      const ab=await file.arrayBuffer();
      const res=await mammoth.extractRawText({arrayBuffer:ab});
      if(res.value.length>APP_CONFIG.pdf.maxExtractedMB*1048576) return res.value.slice(0,APP_CONFIG.pdf.maxExtractedMB*1048576)+'\n[...truncated]';
      return res.value||'No text.';
    }
    return 'DOCX support requires mammoth.js. Convert to PDF/TXT.';
  }
  let ttsUtterance=null, ttsState='stopped';
  function loadVoices() { return new Promise(resolve=>{ let v=window.speechSynthesis.getVoices(); if(v.length) resolve(v); else window.speechSynthesis.onvoiceschanged=()=>resolve(window.speechSynthesis.getVoices()); setTimeout(()=>resolve(window.speechSynthesis.getVoices()),1000); }); }
  function speak(text,options={},callbacks={}) {
    if(!window.speechSynthesis) throw new Error('TTS not supported');
    let ttsText=text.length>5000?text.slice(0,5000)+'...[truncated]':text;
    window.speechSynthesis.cancel();
    ttsUtterance=new SpeechSynthesisUtterance(ttsText);
    ttsUtterance.rate=Math.min(2,Math.max(0.5,options.rate||1));
    ttsUtterance.pitch=Math.min(2,Math.max(0.5,options.pitch||1));
    ttsUtterance.volume=options.volume||1;
    if(options.voice) { const v=window.speechSynthesis.getVoices().find(v=>v.name===options.voice); if(v) ttsUtterance.voice=v; }
    ttsUtterance.onstart=()=>{ ttsState='playing'; callbacks.onStart?.(); };
    ttsUtterance.onend=()=>{ ttsState='stopped'; callbacks.onEnd?.(); };
    ttsUtterance.onerror=e=>{ ttsState='stopped'; callbacks.onError?.(e.error); };
    window.speechSynthesis.speak(ttsUtterance);
    ttsState='playing';
  }
  function pauseSpeak() { if(window.speechSynthesis.speaking) { window.speechSynthesis.pause(); ttsState='paused'; } }
  function resumeSpeak() { if(window.speechSynthesis.paused) { window.speechSynthesis.resume(); ttsState='playing'; } }
  function stopSpeak() { window.speechSynthesis.cancel(); ttsState='stopped'; ttsUtterance=null; }
  function getTTSState() { return ttsState; }
  function isTTSSupported() { return 'speechSynthesis' in window; }
  return { extractTextFromFile, loadVoices, speak, pauseSpeak, resumeSpeak, stopSpeak, getTTSState, isTTSSupported };
})();
window.AIService = AIService;