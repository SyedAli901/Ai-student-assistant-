const API = (() => {
  const PROVIDERS = {
    gemini: {
      name:'Gemini Flash', keyName:'gemini_api_key', signupUrl:'https://aistudio.google.com/app/apikey', keyPrefix:'AIza', dailyLimit:1500,
      async call(prompt,system,options={}){
        const key=DB.getSetting('gemini_api_key','');
        if(!key) throw new Error('NO_KEY');
        const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:options.temperature??0.6,maxOutputTokens:options.maxTokens??1024}};
        if(system) body.systemInstruction={parts:[{text:system}]};
        const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        Monitor.logRequest('gemini',res.status);
        if(res.status===429) throw new Error('RATE_LIMIT');
        if(!res.ok) throw new Error('HTTP_'+res.status);
        const data=await res.json();
        const text=data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if(!text) throw new Error('EMPTY_RESPONSE');
        const usage=data?.usageMetadata;
        if(usage) Monitor.logTokens(usage.promptTokenCount,usage.candidatesTokenCount);
        return text;
      },
      async testKey(key){
        try{
          const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
          const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:'Hi'}]}],generationConfig:{maxOutputTokens:5}})});
          return res.ok;
        }catch(e){return false;}
      }
    },
    groq: {
      name:'Groq (Llama 3)', keyName:'groq_api_key', signupUrl:'https://console.groq.com/keys', keyPrefix:'gsk_', dailyLimit:14400,
      async call(prompt,system,options={}){
        const key=DB.getSetting('groq_api_key','');
        if(!key) throw new Error('NO_KEY');
        const messages=[];
        if(system) messages.push({role:'system',content:system});
        messages.push({role:'user',content:prompt});
        const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'llama3-8b-8192',messages,temperature:options.temperature??0.6,max_tokens:options.maxTokens??1024})});
        Monitor.logRequest('groq',res.status);
        if(res.status===429) throw new Error('RATE_LIMIT');
        if(!res.ok) throw new Error('HTTP_'+res.status);
        const data=await res.json();
        const text=data?.choices?.[0]?.message?.content;
        if(!text) throw new Error('EMPTY_RESPONSE');
        return text;
      },
      async testKey(key){
        try{
          const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'llama3-8b-8192',messages:[{role:'user',content:'Hi'}],max_tokens:5})});
          return res.ok;
        }catch(e){return false;}
      }
    },
    mistral: {
      name:'Mistral', keyName:'mistral_api_key', signupUrl:'https://console.mistral.ai/api-keys', keyPrefix:null, dailyLimit:500,
      async call(prompt,system,options={}){
        const key=DB.getSetting('mistral_api_key','');
        if(!key) throw new Error('NO_KEY');
        const messages=[];
        if(system) messages.push({role:'system',content:system});
        messages.push({role:'user',content:prompt});
        const res=await fetch('https://api.mistral.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'mistral-small-latest',messages,temperature:options.temperature??0.5,max_tokens:options.maxTokens??1024})});
        Monitor.logRequest('mistral',res.status);
        if(res.status===429) throw new Error('RATE_LIMIT');
        if(!res.ok) throw new Error('HTTP_'+res.status);
        const data=await res.json();
        const text=data?.choices?.[0]?.message?.content;
        if(!text) throw new Error('EMPTY_RESPONSE');
        return text;
      },
      async testKey(key){
        try{
          const res=await fetch('https://api.mistral.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'mistral-small-latest',messages:[{role:'user',content:'Hi'}],max_tokens:5})});
          return res.ok;
        }catch(e){return false;}
      }
    },
    huggingface: {
      name:'HuggingFace', keyName:'hf_api_key', signupUrl:'https://huggingface.co/settings/tokens', keyPrefix:'hf_', dailyLimit:99999,
      async call(prompt,system,options={}){
        const key=DB.getSetting('hf_api_key','');
        if(!key) throw new Error('NO_KEY');
        const fullPrompt=system?`${system}\n\n${prompt}`:prompt;
        const res=await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({inputs:fullPrompt,parameters:{max_new_tokens:options.maxTokens??512,temperature:options.temperature??0.6}})});
        Monitor.logRequest('huggingface',res.status);
        if(res.status===429||res.status===503) throw new Error('RATE_LIMIT');
        if(!res.ok) throw new Error('HTTP_'+res.status);
        const data=await res.json();
        const text=Array.isArray(data)?data[0]?.generated_text:data?.generated_text;
        if(!text) throw new Error('EMPTY_RESPONSE');
        return text.replace(fullPrompt,'').trim()||text;
      },
      async testKey(key){
        try{
          const res=await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({inputs:'Hi',parameters:{max_new_tokens:5}})});
          return res.ok;
        }catch(e){return false;}
      }
    }
  };
  const FALLBACK_ORDER=['gemini','groq','mistral','huggingface'];
  async function fallbackChain(prompt,system,options={}){
    const errors=[];
    for(const name of FALLBACK_ORDER){
      const prov=PROVIDERS[name];
      const key=DB.getSetting(prov.keyName,'');
      if(!key){ errors.push(`${name}: no key`); continue; }
      try{
        Monitor.info(`Trying ${name}`);
        const res=await prov.call(prompt,system,options);
        DB.setSetting('last_provider_used',name);
        return {text:res,provider:name};
      }catch(err){ errors.push(`${name}: ${err.message}`); Monitor.warn(`${name} failed: ${err.message}`); continue; }
    }
    throw new Error(`All providers failed:\n${errors.join('\n')}`);
  }
  function detectQuestionType(q){
    const l=q.toLowerCase();
    if(/\d.*[\+\-\*\/\^=]|\b(calculate|solve|equation|algebra|calculus|integral|derivative|math|formula|theorem|proof|geometry|trigonometry)\b/.test(l)) return 'math';
    if(/\b(physics|chemistry|biology|science|atom|molecule|cell|force|energy|gravity|chemical|reaction|element)\b/.test(l)) return 'science';
    if(/\b(summarize|summary|shorten|condense|brief|overview|key points|main ideas)\b/.test(l)) return 'summary';
    if(/\b(code|program|function|algorithm|javascript|python|java|html|css|bug|error|syntax)\b/.test(l)) return 'code';
    return 'general';
  }
  const ROUTE_MAP={math:['mistral','groq','gemini','huggingface'],science:['mistral','gemini','groq','huggingface'],summary:['gemini','groq','mistral','huggingface'],code:['groq','mistral','gemini','huggingface'],general:['gemini','groq','mistral','huggingface']};
  async function smartRoute(prompt,system,options={}){
    const type=detectQuestionType(prompt);
    const order=ROUTE_MAP[type]||ROUTE_MAP.general;
    Monitor.info(`Smart route: type=${type} → ${order.join(' → ')}`);
    const errors=[];
    for(const name of order){
      const prov=PROVIDERS[name];
      const key=DB.getSetting(prov.keyName,'');
      if(!key){ errors.push(`${name}: no key`); continue; }
      try{
        const res=await prov.call(prompt,system,options);
        DB.setSetting('last_provider_used',name);
        return {text:res,provider:name,type};
      }catch(err){ errors.push(`${name}: ${err.message}`); continue; }
    }
    throw new Error(`Smart routing failed:\n${errors.join('\n')}`);
  }
  async function crossVerify(prompt,system,options={}){
    const available=FALLBACK_ORDER.filter(n=>DB.getSetting(PROVIDERS[n].keyName,''));
    if(available.length<2) return await fallbackChain(prompt,system,options);
    const [p1,p2]=available.slice(0,2);
    Monitor.info(`Cross-verify: ${p1} vs ${p2}`);
    const [r1,r2]=await Promise.allSettled([PROVIDERS[p1].call(prompt,system,options),PROVIDERS[p2].call(prompt,system,options)]);
    const ans1=r1.status==='fulfilled'?r1.value:null;
    const ans2=r2.status==='fulfilled'?r2.value:null;
    if(!ans1 && !ans2) throw new Error('Both providers failed');
    if(!ans1) return {text:ans2,provider:p2,verified:false};
    if(!ans2) return {text:ans1,provider:p1,verified:false};
    const primary=ans1.length>=ans2.length?ans1:ans2;
    const usedProvider=ans1.length>=ans2.length?p1:p2;
    return {text:primary,provider:usedProvider,verified:true,secondProvider:usedProvider===p1?p2:p1};
  }
  function getStrategy(){ return DB.getSetting('ai_strategy','smart'); }
  function setStrategy(s){ DB.setSetting('ai_strategy',s); Monitor.info('Strategy set to '+s); }
  async function callAI(prompt,system,options={}){
    const s=getStrategy();
    if(s==='verify') return await crossVerify(prompt,system,options);
    if(s==='smart') return await smartRoute(prompt,system,options);
    return await fallbackChain(prompt,system,options);
  }
  const SYSTEMS={qa:`You are StudyAI, an expert academic assistant. Give clear, accurate answers. Use bullet points.`, summary:`You are an expert summarizer. Be concise. Highlight only important points.`};
  const SUMMARY_STYLES={bullets:'Create concise bullet-point summary using •.', paragraph:'Write a clear 2-3 paragraph summary.', flashcards:'Create 5-8 flashcard Q&A pairs. Format: Q: ... A: ...'};
  async function askQuestion(question,context=''){
    const prompt=context?`Student Notes:\n${context.slice(0,APP_CONFIG.api.contextWindow)}\n\nQuestion: ${question}`:question;
    const result=await callAI(prompt,SYSTEMS.qa,{temperature:0.5});
    return formatResult(result);
  }
  async function summarize(text,style='bullets'){
    const instruction=SUMMARY_STYLES[style]||SUMMARY_STYLES.bullets;
    const prompt=`${instruction}\n\nContent:\n\n${text.slice(0,6000)}`;
    const result=await callAI(prompt,SYSTEMS.summary,{temperature:0.3,maxTokens:APP_CONFIG.api.maxTokens});
    return formatResult(result);
  }
  function formatResult(result){
    const badge=`\n\n---\n_Answered by: **${PROVIDERS[result.provider]?.name||result.provider}**${result.verified?' ✓ Cross-verified':''}${result.type?' · Type: '+result.type:''}_`;
    return {text:result.text,meta:badge,provider:result.provider,full:result.text+badge};
  }
  function hasAnyKey(){ return FALLBACK_ORDER.some(n=>!!DB.getSetting(PROVIDERS[n].keyName,'')); }
  function hasKey(){ return hasAnyKey(); }
  function getProviderList(){ return FALLBACK_ORDER.map(n=>({id:n,...PROVIDERS[n],hasKey:!!DB.getSetting(PROVIDERS[n].keyName,''),key:DB.getSetting(PROVIDERS[n].keyName,'')})); }
  async function testProviderKey(pid,key){ const p=PROVIDERS[pid]; return p?await p.testKey(key):false; }
  function saveProviderKey(pid,key){ const p=PROVIDERS[pid]; if(p) DB.setSetting(p.keyName,key); }
  return { hasAnyKey, hasKey, askQuestion, summarize, getProviderList, testProviderKey, saveProviderKey, getStrategy, setStrategy, PROVIDERS, FALLBACK_ORDER };
})();
window.API = API;