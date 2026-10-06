(() => {
    // Voice mode: the AI answers out loud. Free: uses the browser's built-in speech (works on GitHub Pages).
    // Answers come from faq.js. Optional: window.CHAT_API = 'https://your-worker.workers.dev' for a real free AI.
    const API = window.CHAT_API || null;
    const CHIPS = ['What have you built?', 'Why should we hire you?', 'Tell me about Chesscope', 'How can I contact you?'];
    const synth = window.speechSynthesis || null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    const root = document.createElement('div');
    root.className = 'chat';
    root.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-expanded="false" aria-controls="chatPanel">Talk to me</button>
    <section class="chat-panel" id="chatPanel" hidden aria-label="Talk to the AI voice of Dhananjay">
      <header>
        <div><b>Talk to me</b><span>AI voice of Dhananjay</span></div>
        <button id="chatClose" aria-label="Close">&times;</button>
      </header>
      <div class="voice-body">
        <p class="status" id="status" aria-live="polite">Tap the mic and ask me anything</p>
        <button class="mic" id="mic" aria-label="Ask by voice"></button>
        <div class="caption" id="caption" aria-live="polite"></div>
        <div class="chat-chips" id="chips"></div>
      </div>
      <form class="chat-form" id="form">
        <input id="input" maxlength="300" placeholder="or type your question" autocomplete="off" aria-label="Your question">
        <button type="submit">Ask</button>
      </form>
    </section>`;
    document.body.appendChild(root);

    const $ = id => root.querySelector('#' + id);
    const fab = $('chatFab'), panel = $('chatPanel'), status = $('status'), mic = $('mic'),
        caption = $('caption'), chipsEl = $('chips'), form = $('form'), input = $('input');
    const history = [];
    let state = 'idle', busy = false, token = 0, greeted = false, rec = null, voice = null;

    /* ---------- voice ---------- */
    function pickVoice() {
        const v = synth ? synth.getVoices() : [];
        const male = x => !/female/i.test(x.name) && /male|ravi|rishi|daniel|david|alex|google uk english male/i.test(x.name);
        voice = v.find(x => /en[-_]IN/i.test(x.lang) && male(x)) || v.find(x => /en[-_]IN/i.test(x.lang))
            || v.find(x => /^en/i.test(x.lang) && male(x)) || v.find(x => /^en/i.test(x.lang)) || null;
    }
    if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

    // make written text sound right when read aloud
    const speakable = t => t
        .replace(/\S+@\S+/g, 'the email shown on this page')
        .replace(/(github|linkedin)\.com\S*/gi, 'the link on this page')
        .replace(/C\+\+/g, 'C plus plus').replace(/Node\.js/g, 'Node J S').replace(/B\.E\./g, 'B E')
        .replace(/\b(PWA|MSBTE|SQL|DBMS|OS|CSS|HTML|API|APIs)\b/g, m => m.split('').join(' '))
        .replace(/ · /g, ', ');

    function speak(text) {
        if (!synth) return Promise.resolve();
        synth.cancel();
        const my = ++token;
        const parts = speakable(text).match(/[^.!?]+[.!?]*/g) || [text]; // short chunks avoid browsers cutting long speech
        return new Promise(res => {
            let i = 0;
            const next = () => {
                if (my !== token || i >= parts.length) return res();
                const u = new SpeechSynthesisUtterance(parts[i++].trim());
                if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-IN';
                u.rate = 1; u.pitch = 0.95;
                u.onboundary = () => { window.__mouthTarget = 1; };
                u.onend = next; u.onerror = () => res();
                synth.speak(u);
            };
            next();
        });
    }
    const stopSpeaking = () => { token++; if (synth) synth.cancel(); };

    /* ---------- lip movement ---------- */
    let mouthTimer = null;
    function mouthLoop(on) {
        clearInterval(mouthTimer);
        window.__mouthTarget = 0;
        if (!on) return;
        mouthTimer = setInterval(() => {  // random open/close like syllables; word boundaries open it fully
            window.__mouthTarget = Math.random() < 0.2 ? 0.05 : 0.35 + Math.random() * 0.65;
        }, 110);
    }

    /* ---------- state ---------- */
    const LABEL = { idle: 'Tap the mic and ask me anything', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking... tap to stop' };
    function setState(s) {
        state = s;
        status.textContent = LABEL[s];
        mic.dataset.state = s;
        mouthLoop(s === 'speaking'); // lips move while speaking (see script.js)
    }
    setState('idle');

    function show(q, a) {
        caption.innerHTML = '';
        if (q) { const p = document.createElement('p'); p.className = 'q'; p.textContent = q; caption.appendChild(p); }
        const p = document.createElement('p'); p.className = 'a'; p.textContent = a; caption.appendChild(p);
    }

    /* ---------- answers ---------- */
    function localAnswer(q) {
        const t = q.toLowerCase();
        let best = null, top = 0;
        for (const e of (window.FAQ || [])) {
            const score = e.k.reduce((n, w) => n + (t.includes(w) ? w.length : 0), 0);
            if (score > top) { top = score; best = e; }
        }
        return best ? best.a : (window.FAQ_FALLBACK || "I'm not sure about that one. Please email me and I'll reply.");
    }

    async function ask(q) {
        q = q.trim();
        if (busy || !q) return;
        busy = true; chipsEl.hidden = true;
        if (synth) synth.speak(new SpeechSynthesisUtterance('')); // unlocks audio on phones (needs a tap)
        setState('thinking');
        history.push({ role: 'user', content: q });
        let text = '';
        if (API) {
            try {
                const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) });
                if (!r.ok) throw 0;
                text = (await r.json()).text || '';
            } catch { text = ''; }
        }
        if (!text) text = localAnswer(q);
        history.push({ role: 'assistant', content: text });
        show(q, text);
        setState('speaking');
        await speak(text);
        if (state === 'speaking') setState('idle');
        busy = false;
    }

    /* ---------- controls ---------- */
    function toggle(open) {
        panel.hidden = !open;
        fab.setAttribute('aria-expanded', open);
        fab.classList.toggle('open', open);
        if (!open) { stopSpeaking(); if (rec) try { rec.abort(); } catch { } setState('idle'); busy = false; return; }
        if (!greeted) {
            greeted = true;
            const hi = "Hi, I'm the AI voice of Dhananjay. Tap the mic and ask me about my projects, skills or education.";
            show('', hi); setState('speaking'); busy = true;
            speak(hi).then(() => { if (state === 'speaking') setState('idle'); busy = false; });
        }
    }
    fab.onclick = () => toggle(panel.hidden);
    $('chatClose').onclick = () => toggle(false);

    mic.onclick = () => {
        if (state === 'speaking' || state === 'thinking') { stopSpeaking(); setState('idle'); busy = false; return; }
        if (state === 'listening') { try { rec.stop(); } catch { } return; }
        if (!SR) { show('', 'Voice input is not supported in this browser. Tap a question below or type one.'); return; }
        stopSpeaking();
        rec = new SR();
        rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1;
        rec.onresult = e => { const t = e.results[0][0].transcript; setState('idle'); ask(t); };
        rec.onerror = () => { setState('idle'); show('', "I couldn't hear you. Check that the microphone is allowed, or tap a question below."); };
        rec.onend = () => { if (state === 'listening') setState('idle'); };
        try { rec.start(); setState('listening'); } catch { setState('idle'); }
    };

    CHIPS.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = c; b.onclick = () => ask(c);
        chipsEl.appendChild(b);
    });
    form.onsubmit = e => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); };
})();