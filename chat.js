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

(() => {
    // Voice to voice AI. No chat window: visitor talks, the portrait thinks, then answers aloud.
    // The "brain" runs inside the visitor's browser (free, no server). Answers come only from brain.js.
    const B = window.BRAIN || { items: [] };
    const THRESHOLD = B.threshold ?? 0.42;
    const synth = window.speechSynthesis || null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const host = document.querySelector('.hero-art');
    if (!host) return;
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    /* ---------- tiny UI: one button + one caption line, over the portrait ---------- */
    const ui = document.createElement('div');
    ui.className = 'talk-ui';
    ui.innerHTML = `<p class="talk-caption" hidden aria-live="polite"></p>
    <button class="talk-btn" type="button" aria-label="Talk to my AI"><span class="ico"></span><span class="lbl">Ask me anything</span></button>`;
    host.appendChild(ui);
    const dots = document.createElement('div');
    dots.className = 'think-dots'; dots.setAttribute('aria-hidden', 'true'); dots.innerHTML = '<i></i><i></i><i></i>';
    host.appendChild(dots);
    const cap = ui.querySelector('.talk-caption'), btn = ui.querySelector('.talk-btn'), label = ui.querySelector('.lbl');
    const say = (t, heard) => { cap.textContent = t; cap.hidden = !t; cap.classList.toggle('heard', !!heard); };

    if (!SR) { // browsers without speech input (e.g. Firefox): small typing box instead
        const f = document.createElement('form');
        f.className = 'talk-type';
        f.innerHTML = '<input maxlength="200" placeholder="Voice input needs Chrome, Edge or Safari. Type here" aria-label="Your question">';
        f.onsubmit = e => { e.preventDefault(); const i = f.querySelector('input'); const q = i.value; i.value = ''; conv = false; ask(q); };
        ui.appendChild(f);
    }

    /* ---------- state ---------- */
    const LABEL = { idle: 'Ask me anything', listening: 'Listening...', thinking: 'Thinking...', waking: 'Waking up my brain...', speaking: 'Tap to stop' };
    let state = 'idle', session = 0, conv = false, rec = null, audioEl = null, clipMode = false,
        greeted = false, voice = null, ac = null, brainReady = false, mouthTimer = null;

    function mouthLoop(on) {
        clearInterval(mouthTimer);
        window.__mouthTarget = 0;
        if (!on) return;
        mouthTimer = setInterval(() => { window.__mouthTarget = Math.random() < 0.2 ? 0.05 : 0.35 + Math.random() * 0.65; }, 110);
    }
    function setState(s) {
        state = s;
        label.textContent = LABEL[s];
        btn.dataset.state = s;
        document.body.dataset.voice = s;                 // CSS shows the thinking dots
        window.__think = s === 'thinking' || s === 'waking'; // eyes glance away while thinking (script.js)
        window.__attend = s === 'listening';             // eyes look straight at the visitor
        mouthLoop(s === 'speaking' && !clipMode);
    }
    setState('idle');

    /* ---------- the brain: understands meaning, answers only from brain.js ---------- */
    let brainPromise = null;
    const flat = []; B.items.forEach((it, i) => it.q.forEach(q => flat.push({ i, q })));
    function loadBrain() {
        if (brainPromise) return brainPromise;
        brainPromise = (async () => {
            try {
                const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
                env.allowLocalModels = false;
                const ex = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'); // ~25 MB, cached after the first visit
                const vecs = (await ex(flat.map(f => f.q), { pooling: 'mean', normalize: true })).tolist();
                brainReady = true;
                return { ex, vecs };
            } catch (e) {
                console.warn('AI model could not load, using keyword matching instead.', e);
                brainReady = true;
                return { ex: null, vecs: null };
            }
        })();
        return brainPromise;
    }
    const words = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    async function match(q) {
        const br = await loadBrain();
        let best = -1;
        if (br.vecs) {
            const v = (await br.ex([q], { pooling: 'mean', normalize: true })).tolist()[0];
            let top = 0;
            br.vecs.forEach((u, k) => { let s = 0; for (let d = 0; d < v.length; d++) s += u[d] * v[d]; if (s > top) { top = s; best = flat[k].i; } });
            if (top < THRESHOLD) best = -1;
        } else { // fallback: shared words
            const qw = words(q); let top = 0;
            flat.forEach(f => { const n = words(f.q).filter(w => qw.includes(w)).length; if (n > top) { top = n; best = f.i; } });
            if (top < 2) best = -1;
        }
        return best >= 0 ? B.items[best] : B.unknown;
    }

    /* ---------- voice out ---------- */
    function pickVoice() {
        const v = synth ? synth.getVoices() : [];
        const male = x => !/female/i.test(x.name) && /male|ravi|rishi|daniel|david|alex|google uk english male/i.test(x.name);
        voice = v.find(x => /en[-_]IN/i.test(x.lang) && male(x)) || v.find(x => /en[-_]IN/i.test(x.lang))
            || v.find(x => /^en/i.test(x.lang) && male(x)) || v.find(x => /^en/i.test(x.lang)) || null;
    }
    if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

    const speakable = t => t
        .replace(/\S+@\S+/g, 'the email shown on this page')
        .replace(/(github|linkedin)\.com\S*/gi, 'the link on this page')
        .replace(/C\+\+/g, 'C plus plus').replace(/Node\.js/g, 'Node J S').replace(/B\.E\./g, 'B E')
        .replace(/\b(PWA|MSBTE|SQL|DBMS|CSS|HTML|API|APIs)\b/g, m => m.split('').join(' '))
        .replace(/ · /g, ', ');

    function tts(text, my) {
        if (!synth) return Promise.resolve();
        synth.cancel();
        const parts = speakable(text).match(/[^.!?]+[.!?]*/g) || [text];
        return new Promise(res => {
            let i = 0;
            const next = () => {
                if (my !== session || i >= parts.length) return res();
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

    // your recorded voice: lips follow the real loudness of the audio
    function clip(url, my) {
        return new Promise((res, rej) => {
            const a = new Audio(url); audioEl = a;
            const an = ac.createAnalyser(); an.fftSize = 512;
            ac.createMediaElementSource(a).connect(an); an.connect(ac.destination);
            const buf = new Uint8Array(an.fftSize); let raf;
            const tick = () => {
                an.getByteTimeDomainData(buf);
                let s = 0; for (const v of buf) { const x = (v - 128) / 128; s += x * x; }
                window.__mouthTarget = Math.min(1, Math.sqrt(s / buf.length) * 6);
                raf = requestAnimationFrame(tick);
            };
            a.onplay = tick;
            a.onended = () => { cancelAnimationFrame(raf); window.__mouthTarget = 0; res(); };
            a.onerror = () => { cancelAnimationFrame(raf); rej(new Error('audio')); };
            a.play().catch(rej);
        });
    }

    async function deliver(item, my) {
        say(item.a);
        if (item.audio && ac) {
            clipMode = true; setState('speaking');
            try { await clip(item.audio, my); clipMode = false; return; } catch { clipMode = false; }
            if (my !== session) return;
        }
        setState('speaking');
        await tts(item.a, my);
    }

    /* ---------- flow ---------- */
    function unlock() {
        if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { } }
        if (ac && ac.state === 'suspended') ac.resume();
        if (synth) synth.speak(new SpeechSynthesisUtterance('')); // lets phones speak after async work
    }
    function stopAll() {
        session++;
        if (synth) synth.cancel();
        if (audioEl) { try { audioEl.pause(); } catch { } audioEl = null; }
        if (rec) { try { rec.abort(); } catch { } }
        clipMode = false;
    }

    async function ask(q, viaVoice) {
        q = (q || '').trim();
        if (!q) { setState('idle'); return; }
        const my = ++session;
        say('You: ' + q, true);
        setState(brainReady ? 'thinking' : 'waking');
        const t0 = performance.now();
        const item = await match(q);
        await sleep(Math.max(0, 1000 - (performance.now() - t0))); // a natural thinking pause
        if (my !== session) return;
        await deliver(item, my);
        if (my !== session) return;
        setState('idle');
        if (viaVoice && conv) { await sleep(350); if (my === session) listen(); }
    }

    function listen() {
        if (!SR) return;
        let got = false;
        try { rec = new SR(); } catch { return; }
        rec.lang = 'en-IN'; rec.interimResults = true; rec.maxAlternatives = 1;
        rec.onresult = e => {
            let t = '', fin = false;
            for (let i = e.resultIndex; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
            say(t, true);
            if (fin && !got) { got = true; ask(t, true); }
        };
        rec.onerror = e => {
            conv = false; setState('idle');
            say(e.error === 'not-allowed' || e.error === 'service-not-allowed'
                ? 'Microphone is blocked. Allow it in your browser settings, then tap again.'
                : "I didn't hear anything. Tap and ask again.");
        };
        rec.onend = () => { if (state === 'listening' && !got) setState('idle'); };
        try { rec.start(); setState('listening'); } catch { setState('idle'); }
    }

    btn.onclick = async () => {
        unlock();
        if (state !== 'idle') { // tap = stop whatever is happening
            conv = false; stopAll(); setState('idle'); return;
        }
        conv = true;
        loadBrain();
        if (!greeted) {
            greeted = true;
            const my = ++session;
            await deliver(B.greeting, my);
            if (my !== session) return;
            setState('idle');
        }
        if (conv) listen();
    };

    // start loading the brain quietly (skipped on slow or data-saver connections)
    const c = navigator.connection;
    if (!(c && (c.saveData || /2g|3g/.test(c.effectiveType || '')))) {
        addEventListener('load', () => setTimeout(loadBrain, 2500));
    }
})();
