/* Plain browser JavaScript; also bundled into the Apps Script HTML service. */
(() => {
  'use strict';
  const app = document.querySelector('#app');
  const status = document.querySelector('#save-status');
  const rubric = window.RUBRIC;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 15 9-15 9z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
  const time = seconds => `0:${String(Math.floor(Math.max(0, seconds))).padStart(2, '0')}`;
  let study, config, state, storageKey, saving = false, memoryOnly = false, submissionError = '';
  let cleanups = [];
  const shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      // Rejection sampling avoids modulo bias, including when assigning the three candidates.
      const limit = Math.floor(4294967296 / (i + 1)) * (i + 1);
      let n; do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= limit);
      const j = n % (i + 1); [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const totalRatings = () => study.items.length * 3 * rubric.length;
  const itemById = id => study.items.find(item => item.id === id);
  const ratingCount = id => Object.values(state.ratings[id] || {}).reduce((n, ratings) => n + rubric.filter(r => Number.isInteger(ratings[r.id])).length, 0);
  const answered = () => state.itemOrder.reduce((n, id) => n + ratingCount(id), 0);

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch (_) { memoryOnly = true; }
    status.textContent = !state.receipt && memoryOnly ? 'Keep this page open · local saving unavailable' : '';
    status.hidden = !status.textContent;
  }
  function stopPlayers() {
    document.querySelectorAll('audio').forEach(audio => audio.pause());
    cleanups.forEach(cleanup => cleanup()); cleanups = [];
  }
  function render() {
    stopPlayers();
    if (state.receipt) renderThanks();
    else if (state.pendingPayload) renderSubmission();
    else if (state.page === 'intro') renderIntro();
    else renderItem();
    persist();
  }
  function navigate(page, index) {
    stopPlayers();
    state.page = page;
    if (index !== undefined) state.index = index;
    render(); window.scrollTo({top:0, behavior:'instant'}); app.focus();
  }
  function descriptionHTML(criterion) {
    let html = escape(criterion.description);
    for (const highlight of criterion.descriptionHighlights || []) {
      const phrase = escape(highlight.text);
      const className = highlight.tone === 'exclude' ? 'criterion-highlight criterion-highlight-exclude' : 'criterion-highlight';
      html = html.replace(phrase, () => `<strong class="${className}">${phrase}</strong>`);
    }
    return html;
  }
  function guideHTML({intro = false} = {}) {
    if (intro) {
      const labels = ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'];
      const meanings = [
        'The evaluated aspect has severe problems.',
        'The evaluated aspect has substantial problems.',
        'The evaluated aspect is acceptable, but noticeable problems remain.',
        'The evaluated aspect is good, with only minor problems.',
        'The evaluated aspect is very good, with no noticeable problems.'
      ];
      return `<section class="intro-questionnaire" aria-labelledby="questionnaire-heading"><h2 id="questionnaire-heading">Questionnaire</h2>
        <p>For each continuation, you will evaluate six aspects using a <strong>1–5 scale (1: Very poor ~ 5: Excellent)</strong>.</p>
        <ul class="general-scale">${[5,4,3,2,1].map(score => `<li><strong>${score} — ${labels[score-1]}:</strong> ${meanings[score-1]}</li>`).join('')}</ul>
        <div class="criteria-explanations">${rubric.map((r,index) => `<section aria-labelledby="intro-${r.id}"><h3 id="intro-${r.id}">${index+1}. ${escape(r.name)}</h3><p>${descriptionHTML(r)}</p></section>`).join('')}</div>
      </section>`;
    }
    return `<section class="guide" id="rating-guide"><h2>How to use the 1–5 scale</h2><p class="note">1 = Very poor · 2 = Poor · 3 = Fair · 4 = Good · 5 = Excellent.</p><div class="guide-grid">${rubric.map(r => `<section><h3>${escape(r.name)}</h3><p>${descriptionHTML(r)}</p><ol>${r.anchors.map(a => `<li>${escape(a)}</li>`).join('')}</ol></section>`).join('')}</div></section>`;
  }
  function renderIntro() {
    app.innerHTML = `<header class="intro-heading"><div class="eyebrow">Participant instructions</div><h1>Dialogue Continuation Listening Test</h1><p class="lead"><strong>Dialogue continuation</strong> is the task of generating the next part of a spoken conversation, given the preceding conversation as a prompt. In this test, you will listen to a 15-second prompt and three 15-second continuations, then rate each continuation on six criteria using a 1–5 scale.</p></header>
      <div class="intro-document">${guideHTML({intro:true})}
      <section class="intro-important" aria-labelledby="important-heading"><h2 id="important-heading">Important notes</h2><ul>
        <li>Please use a desktop or laptop with a Chrome browser. Participate in a quiet environment while using <strong>headphones or earphones</strong>.</li>
        <li>Rate only the continuation, using the prompt as context. Evaluate each sample individually rather than ranking the samples.</li>
        <li>Do not penalize a sample simply because it ends mid-sentence at the clip boundary.</li>
      </ul></section>
      <aside class="intro-aside" aria-label="Participant information">${config.mode === 'local' ? '' : config.mode === 'static' ? '<p class="notice">Preview mode. Responses cannot be submitted from this preview.</p>' : '<p class="note">Your ratings and playback activity will be sent to the research team when you submit.</p>'}
      <form id="start-form"><label class="form-field"><span>Name</span><input name="name" maxlength="100" required autocomplete="name" placeholder="Enter your name" value="${escape(state.participant.name)}"></label>
      <label class="form-field"><span>How comfortable are you understanding spoken English?</span><select name="english" required><option value="">Select one</option>${[['native','Native or bilingual'],['fluent','Fluent'],['limited','Limited']].map(([value,label]) => `<option value="${value}" ${state.participant.english === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <button class="primary full-width" type="submit">${answered() ? 'Resume listening' : 'Begin listening'} <span aria-hidden="true">→</span></button></form></aside></div>`;
    const nameInput = document.querySelector('#start-form input[name="name"]');
    nameInput.oninput = () => nameInput.setCustomValidity('');
    document.querySelector('#start-form').onsubmit = event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      const name = String(data.get('name') || '').trim();
      if (!name) { nameInput.setCustomValidity('Please enter your name.'); nameInput.reportValidity(); return; }
      nameInput.setCustomValidity('');
      state.participant = {name,english:String(data.get('english'))};
      delete state.consent;
      navigate('item',state.index || 0);
    };
  }
  function scriptHTML(script, label) {
    return `<div class="script"><h4>${label}</h4><ol aria-label="${label}">${script.map(turn => `<li><span class="speaker ${turn.speaker === 'B' ? 'b' : ''}" aria-label="Speaker ${escape(turn.speaker)}">${escape(turn.speaker)}</span><p>${escape(turn.text)}</p></li>`).join('')}</ol></div>`;
  }
  function playerHTML(track, label, continuation) {
    const paths = track.peaks.map((peaks, channel) => {
      const path = peaks.map((peak, i) => { const x = (i+.5)/peaks.length*640; const height=Math.max(.55, Math.min(1, Math.abs(peak))*23); return `M${x.toFixed(1)},${(channel*60+35-height).toFixed(1)}v${(2*height).toFixed(1)}`; }).join(' ');
      return `<path d="${path}" stroke="${channel ? '#bd725b' : '#3975b9'}" stroke-width="1.5" opacity=".6"/>`;
    }).join('');
    return `<div class="audio-player" data-track="${track.id}" role="group" aria-label="${label}">${continuation ? '<div class="regions" aria-hidden="true"><span>Prompt</span><span>Generated continuation</span></div>' : ''}<div class="wave">${continuation ? '<div class="prompt-shade"></div>' : ''}<svg viewBox="0 0 640 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60H640" stroke="#e5e9ee"/>${paths}</svg><span class="wave-label">Speaker A · Left</span><span class="wave-label b">Speaker B · Right</span>${continuation ? '<div class="seam"></div>' : ''}<div class="playhead"></div><input type="range" min="0" max="${track.duration}" step="0.1" value="0" aria-label="Seek ${label}" aria-valuetext="0 seconds"></div><div class="axis" aria-hidden="true"><span>0:00</span>${continuation ? '<span class="boundary">0:15</span>' : ''}<span>${time(track.duration)}</span></div><div class="transport"><button type="button" class="transport-button play" aria-label="Play ${label}">${playIcon}<span>Play</span></button>${continuation ? `<button type="button" class="transport-button jump" aria-label="Play continuation ${label}">${playIcon}<span>Play continuation</span></button>` : ''}<span class="time">0:00 / ${time(track.duration)}</span></div><p class="error" role="alert" hidden></p><audio preload="metadata"></audio></div>`;
  }
  function criterionHTML(r, candidate, item) {
    const selected = state.ratings[item.id]?.[candidate.id]?.[r.id];
    return `<fieldset class="criterion" data-criterion="${r.id}" aria-describedby="rating-scale"><legend>${escape(r.name)}</legend><div class="score-row">${r.anchors.map((anchor,i) => `<label class="score-choice" title="${i+1}: ${escape(anchor)}"><input type="radio" name="${candidate.id}-${r.id}" value="${i+1}" data-candidate="${candidate.id}" data-criterion="${r.id}" aria-label="${i+1}: ${escape(anchor)}" ${selected === i+1 ? 'checked' : ''}><span aria-hidden="true">${i+1}</span></label>`).join('')}</div></fieldset>`;
  }
  function renderItem() {
    const item = itemById(state.itemOrder[state.index]);
    const candidates = state.candidateOrder[item.id].map(id => item.candidates.find(c => c.id === id));
    app.innerHTML = `<header class="section-head"><div><h1>Item ${state.index+1} of ${study.items.length}</h1><p class="lead">Listen to the prompt, then rate each continuation on its own merits.</p></div><div class="progress-area"><div class="progress-track"><i id="progress-fill" style="width:${answered()/totalRatings()*100}%"></i></div><nav class="item-nav" aria-label="Conversation items">${state.itemOrder.map((id,i) => `<button type="button" data-index="${i}" class="${i===state.index?'current':ratingCount(id)===18?'complete':''}" aria-label="Go to conversation ${i+1}" ${i===state.index?'aria-current="step"':''}>${i+1}</button>`).join('')}</nav></div></header>
      <section class="prompt-section"><header><h2>Prompt</h2><span class="tiny">15 seconds · listen first</span></header>${playerHTML(item.prompt,'prompt',false)}${scriptHTML(item.prompt.script,'Prompt script')}</section>
      <div class="candidates-heading"><button type="button" class="secondary guide-toggle" id="toggle-guide" aria-expanded="false" aria-controls="guide-panel">Rating guide</button><div class="rating-scale" id="rating-scale"><div class="rating-scale-bar" aria-hidden="true">${[0,25,50,75,100].map(position=>`<i style="left:${position}%"></i>`).join('')}</div><div class="rating-scale-points">${['Very poor','Poor','Fair','Good','Excellent'].map((label,index)=>`<span><strong>${index+1}</strong><span>${label}</span></span>`).join('')}</div></div></div><div id="guide-panel" hidden>${guideHTML()}</div>
      <div class="candidates">${candidates.map((candidate,i) => `<article class="candidate" aria-labelledby="candidate-heading-${i}"><header><h3 id="candidate-heading-${i}">Continuation ${'ABC'[i]}</h3></header>${playerHTML(candidate,`continuation ${'ABC'[i]}`,true)}${scriptHTML(candidate.script,'Continuation script')}<section class="rating-section" aria-label="Rate continuation ${'ABC'[i]}">${rubric.map(r=>criterionHTML(r,candidate,item)).join('')}</section></article>`).join('')}</div>
      <div class="nav-footer"><button class="secondary" id="previous">← ${state.index ? 'Previous' : 'Instructions'}</button><button class="primary" id="next">${state.index===study.items.length-1 ? 'Submit' : 'Next conversation'} →</button></div><p id="item-error" class="error" role="alert"></p>`;
    bindPlayer(item.prompt, false); candidates.forEach(candidate=>bindPlayer(candidate,true));
    document.querySelectorAll('.item-nav button').forEach(button=>button.onclick=()=>navigate('item',Number(button.dataset.index)));
    document.querySelector('#previous').onclick=()=>state.index ? navigate('item',state.index-1) : navigate('intro');
    document.querySelector('#next').onclick=()=>{
      if (ratingCount(item.id)!==18) { document.querySelector('#item-error').textContent='Please rate all six aspects for each continuation before continuing.'; return; }
      if (state.index===study.items.length-1) submit();
      else navigate('item',state.index+1);
    };
    document.querySelector('#toggle-guide').onclick=event=>{ const panel=document.querySelector('#guide-panel'); panel.hidden=!panel.hidden; event.currentTarget.setAttribute('aria-expanded',String(!panel.hidden)); };
    document.querySelectorAll('.score-choice input').forEach(input=>input.onchange=()=>{
      state.ratings[item.id] ||= {}; state.ratings[item.id][input.dataset.candidate] ||= {};
      const value=Number(input.value);
      state.ratings[item.id][input.dataset.candidate][input.dataset.criterion]=value;
      document.querySelector('#progress-fill').style.width=`${answered()/totalRatings()*100}%`;
      document.querySelector('#item-error').textContent=''; persist();
    });
  }
  function bindPlayer(track, continuation) {
    const root=document.querySelector(`[data-track="${track.id}"]`), audio=root.querySelector('audio');
    audio.src = config.mediaBaseUrl ? new URL(track.src, config.mediaBaseUrl.endsWith('/') ? config.mediaBaseUrl : `${config.mediaBaseUrl}/`).href : track.src;
    const seek=root.querySelector('input'), play=root.querySelector('.play'), jump=root.querySelector('.jump'), error=root.querySelector('.error');
    state.listening[track.id] ||= {seconds:0,plays:0}; state.coverage[track.id] ||= [];
    const covered=new Set(state.coverage[track.id]); let previousTime=0, lastWall=0;
    const update = () => {
      const now=audio.currentTime, wall=performance.now(), delta=now-previousTime;
      // Count heard intervals, excluding seeks and prompt portions of a continuation track.
      if (!audio.paused && !audio.seeking && lastWall && delta>0 && delta<1 && wall-lastWall<1500) {
        const start=Math.max(previousTime,continuation?15:0), end=Math.min(now,track.duration);
        if (end>start) {
          state.listening[track.id].seconds+=end-start;
          for(let t=Math.floor((start-(continuation?15:0))*4);t<Math.floor((end-(continuation?15:0))*4);t++) covered.add(t);
          state.coverage[track.id]=[...covered];
        }
      }
      previousTime=now; lastWall=wall;
      root.querySelector('.playhead').style.left=`${Math.min(100,now/track.duration*100)}%`;
      seek.value=now; seek.setAttribute('aria-valuetext',`${time(now)} of ${time(track.duration)}`);
      root.querySelector('.time').textContent=`${time(now)} / ${time(track.duration)}`;
    };
    const reportError=message=>{error.hidden=false;error.textContent=message;};
    const start=async position=>{
      error.hidden=true;
      try {
        if(audio.error) audio.load();
        if(position!==undefined) {audio.currentTime=position;previousTime=position;lastWall=0;}
        document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});
        await audio.play();
      } catch(e) {if(e.name!=='AbortError')reportError('Audio could not be played. Check your connection and try again.');}
    };
    play.onclick=()=>audio.paused ? start(audio.ended?0:undefined) : audio.pause();
    if(jump)jump.onclick=()=>start(15);
    seek.oninput=()=>{audio.currentTime=Number(seek.value);previousTime=audio.currentTime;lastWall=0;update();};
    seek.onkeydown=event=>{if(event.code==='Space'){event.preventDefault();play.click();}};
    audio.addEventListener('play',()=>{state.listening[track.id].plays++;previousTime=audio.currentTime;lastWall=performance.now();play.innerHTML=`${pauseIcon}<span>Pause</span>`;play.setAttribute('aria-label',`Pause ${continuation?'continuation':'prompt'}`);});
    audio.addEventListener('pause',()=>{play.innerHTML=`${playIcon}<span>Play</span>`;play.setAttribute('aria-label',`Play ${continuation?'continuation':'prompt'}`);persist();});
    audio.addEventListener('timeupdate',update);
    audio.addEventListener('seeking',()=>{lastWall=0;previousTime=audio.currentTime;});
    audio.addEventListener('ended',()=>{update();persist();});
    audio.addEventListener('error',()=>reportError('Audio could not be loaded. Please check your connection and retry.'));
    cleanups.push(()=>{audio.pause();audio.removeAttribute('src');audio.load();});
    update();
  }
  function payload() {
    return {schemaVersion:2,studyVersion:study.version,sessionId:state.sessionId,startedAt:state.startedAt,completedAt:new Date().toISOString(),participant:{name:String(state.participant.name || '').trim(),english:state.participant.english},itemOrder:state.itemOrder,candidateOrder:state.candidateOrder,ratings:state.ratings,listening:state.listening};
  }
  function renderSubmission() {
    if (config.mode==='static') {
      app.innerHTML='<div class="review-wrap"><h1>Preview complete</h1><p class="lead">Responses cannot be submitted from this preview.</p></div>';
    } else if (submissionError) {
      app.innerHTML='<div class="review-wrap"><h1>Submission could not be confirmed</h1><p class="error" id="submit-error" role="alert">Your answers are kept here. Please try again.</p><button class="primary" id="retry-submit">Try again</button></div>';
      document.querySelector('#retry-submit').onclick=submit;
    } else {
      app.innerHTML='<div class="review-wrap" role="status"><h1>Submitting your responses…</h1><p class="lead">Please keep this page open.</p></div>';
    }
  }
  async function submit() {
    if(saving || state.receipt)return;
    if(!state.pendingPayload && answered()!==totalRatings()) {
      navigate('item',state.itemOrder.findIndex(id=>ratingCount(id)!==18));
      document.querySelector('#item-error').textContent='Please complete all ratings before finishing the test.';
      return;
    }
    saving=true; submissionError='';
    stopPlayers();
    // Freeze a detached snapshot so playback events or reloads cannot change a retry.
    state.pendingPayload ||= JSON.parse(JSON.stringify(payload()));
    state.page='submission'; persist(); render();
    window.scrollTo({top:0,behavior:'instant'}); app.focus();
    if(config.mode==='static') {saving=false;return;}
    try {
      let result;
      if(config.mode==='apps-script') {
        result=await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Confirmation timed out. Retry to check the same submission.')),30000);
          google.script.run.withSuccessHandler(value=>{clearTimeout(timer);resolve(value);}).withFailureHandler(e=>{clearTimeout(timer);reject(new Error(e.message||'Submission failed.'));}).submitResponse(state.pendingPayload);
        });
      } else {
        const response=await fetch('./api/responses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.pendingPayload),signal:AbortSignal.timeout(30000)});
        result=await response.json();if(!response.ok)throw new Error(result.error||'Submission failed.');
      }
      if(result?.ok!==true || !result.receipt)throw new Error('No submission receipt was returned. Please retry.');
      state.receipt=result.receipt;persist();render();
    } catch(error) {
      submissionError=error.message || 'Submission could not be confirmed.';
      render();
    } finally {saving=false;}
  }
  function renderThanks() {
    app.innerHTML='<div class="review-wrap"><h1>Thank you for participating.</h1><p class="lead">Your responses have been submitted successfully.</p></div>';
  }
  async function init() {
    study=window.STUDY || await fetch('./study.json').then(r=>{if(!r.ok)throw new Error('Study files are unavailable.');return r.json();});
    config=window.STUDY_CONFIG;
    if(!config) {
      try {const r=await fetch('./api/config');config=r.ok?await r.json():{mode:'static'};}
      catch(_){config={mode:'static'};}
    }
    storageKey=`dialogue-study:${study.version}:${config.mode}`;
    // Prevent simultaneous tabs from silently overwriting one participant's saved progress.
    if(navigator.locks) {
      const acquired=await new Promise(resolve=>navigator.locks.request(storageKey,{ifAvailable:true},lock=>{resolve(Boolean(lock));return lock?new Promise(()=>{}):undefined;}));
      if(!acquired)throw new Error('This study is already open in another tab. Close the other tab, then reload this page.');
    }
    try {state=JSON.parse(localStorage.getItem(storageKey));}catch(_){memoryOnly=true;}
    if(!state)state={sessionId:crypto.randomUUID(),startedAt:new Date().toISOString(),participant:{name:'',english:''},itemOrder:shuffle(study.items.map(item=>item.id)),candidateOrder:Object.fromEntries(study.items.map(item=>[item.id,shuffle(item.candidates.map(c=>c.id))])),ratings:{},listening:{},coverage:{},page:'intro',index:0};
    if(state.page==='review' && !state.pendingPayload) {state.page='item';state.index=study.items.length-1;}
    if(!state.receipt && !state.pendingPayload && (!String(state.participant.name || '').trim() || !['native','fluent','limited'].includes(state.participant.english))) state.page='intro';
    // Refuse incompatible saved content instead of silently attaching ratings to a new stimulus.
    if(!Array.isArray(state.itemOrder) || state.itemOrder.length!==study.items.length || new Set(state.itemOrder).size!==study.items.length || state.itemOrder.some(id=>{
      const item=itemById(id), order=state.candidateOrder?.[id];
      return !item || !Array.isArray(order) || order.length!==3 || new Set(order).size!==3 || order.some(cid=>!item.candidates.some(c=>c.id===cid));
    }))throw new Error('The study materials have changed. Please contact the researcher before continuing this saved session.');
    window.addEventListener('pagehide',()=>{stopPlayers();persist();});
    document.querySelector('.wordmark').onclick=event=>{event.preventDefault();if(!state.pendingPayload&&!state.receipt)navigate('intro');};
    render();
    if(state.pendingPayload && !state.receipt && config.mode!=='static') await submit();
  }
  init().catch(error=>{status.textContent='Study unavailable';status.hidden=false;app.innerHTML=`<div class="review-wrap"><h1>Unable to open this session</h1><p class="error">${escape(error.message)}</p><button class="secondary" onclick="location.reload()">Reload page</button></div>`;});
})();
