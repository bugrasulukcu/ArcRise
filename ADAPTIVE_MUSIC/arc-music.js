// ArcMusic — ArcRise uyarlanabilir müzik + SFX motoru (Web Audio, ses dosyası yok)
// Kaynak: Claude ile hazırlanan prototip (ADAPTIVE_MUSIC/prototype.html). Entegrasyon: ADAPTIVE_MUSIC/HANDOFF.md
// Tamamen kodla sentezlenir; harici lisanslı ses içermez.
/* ═══════════════ ArcMusic — uyarlanabilir müzik motoru (Web Audio, dosyasız) ═══════════════
   create(ctx, destination) → motor. Gerçek zamanlıda kendi zamanlayıcısıyla çalışır;
   OfflineAudioContext'te { offline:true } ile verilir ve advance(t) ile ileri sarılır.
   Tüm olay metotları isteğe bağlı bir `at` (saniye) alır; verilmezse ctx.currentTime. */
const ArcMusic = (() => {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const PENTA = [0, 3, 5, 7, 10];                    // A minör pentatonik
  const PROG = {
    chill:   [{ n: [57, 60, 64], b: 45, name: 'Am' }, { n: [53, 57, 60], b: 41, name: 'F' }, { n: [55, 60, 64], b: 48, name: 'C' }, { n: [55, 59, 62], b: 43, name: 'G' }],
    extreme: [{ n: [57, 60, 64], b: 45, name: 'Am' }, { n: [53, 57, 60], b: 41, name: 'F' }, { n: [50, 53, 57], b: 38, name: 'Dm' }, { n: [52, 56, 59], b: 40, name: 'E' }],
    vanilla: [{ n: [57, 60, 64], b: 45, name: 'Am' }, { n: [53, 57, 60], b: 41, name: 'F' }, { n: [55, 60, 64], b: 48, name: 'C' }, { n: [55, 59, 62], b: 43, name: 'G' }],
  };
  const LEAD = [76, 74, 72, 69, 72, 74, 76, 79];      // MAX combo lead motifi (E5 D5 C5 A4 ...)

  function makeNoise(ctx) {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    let seed = 1234567;                               // deterministik (çevrimdışı ölçüm tekrarlanabilsin)
    for (let i = 0; i < d.length; i++) { seed = (seed * 16807) % 2147483647; d[i] = seed / 1073741823.5 - 1; }
    return b;
  }
  function makeIR(ctx, sec) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    let seed = 42;
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 1073741823.5 - 1) * Math.pow(1 - i / len, 3.2); }
    }
    return b;
  }

  function create(ctx, out, opts = {}) {
    out = out || ctx.destination;
    const S = { mode: 'chill', scene: 'off', inten: 0, eS: 0, combo: 0, chain: 0, bpm: 96, step: 0, next: 0,
                boostUntil: 0, deadAt: -1, layers: new Set(), chord: '—', timer: null, running: false };
    const G = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const F = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };

    // ── Sinyal yolu ──
    const master = G(0.72), comp = ctx.createDynamicsCompressor(), limiter = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
    const trim = G(0.9);                                   // limiter'in kaçırdığı en hızlı tepeler için pay
    const analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.78;
    master.connect(comp); comp.connect(limiter); limiter.connect(trim); trim.connect(analyser); analyser.connect(out);
    const music = G(0), musicLP = F('lowpass', 700, 0.6), musicVol = G(1);   // musicVol: ayarlardaki müzik aç/kapa
    music.connect(musicLP); musicLP.connect(musicVol); musicVol.connect(master);
    const padLP = F('lowpass', 900, 0.5), padBus = G(1); padLP.connect(padBus); padBus.connect(music);
    const drumBus = G(1); drumBus.connect(music);
    const synthBus = G(1); synthBus.connect(music);
    const sfx = G(0.9); sfx.connect(master);
    // opts.lite (zayıf cihaz / LOWFX): yankı ve gecikme kapalı → çok daha az işlem
    const rev = ctx.createConvolver(); if (!opts.lite) rev.buffer = makeIR(ctx, 2.6);
    const revIn = G(opts.lite ? 0 : 1), revOut = G(0.3); revIn.connect(rev); rev.connect(revOut); revOut.connect(master);
    const padSend = G(0.4); padBus.connect(padSend); padSend.connect(revIn);
    const dly = ctx.createDelay(2), dfb = G(0.36), dIn = G(1), dOut = G(0.42), dLP = F('lowpass', 3200, 0.5);
    if (!opts.lite) { dIn.connect(dly); dly.connect(dLP); dLP.connect(dfb); dfb.connect(dly); dLP.connect(dOut); dOut.connect(music); }
    const noise = makeNoise(ctx);

    // ── Ses üreteçleri ──
    const osc = (type, f, t, end) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; };
    const noiseSrc = (t, end) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, Math.random() * 0.9); s.stop(end); return s; };

    function padNote(m, t, dur, lvl) {
      const end = t + dur + 1.2;
      for (const det of [-9, 8]) {
        const o = osc('sawtooth', mtof(m), t, end); o.detune.setValueAtTime(det, t);
        const g = G(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.45);
        g.gain.setValueAtTime(lvl, t + dur); g.gain.linearRampToValueAtTime(0, end);
        o.connect(g); g.connect(padLP);
      }
    }
    function bass(m, t, len, lvl, bright) {
      const end = t + len + 0.05;
      const o = osc('sawtooth', mtof(m), t, end), sub = osc('sine', mtof(m - 12), t, end);
      const f = F('lowpass', 200 + bright * 1600, 4);
      f.frequency.setValueAtTime(260 + bright * 2200, t); f.frequency.exponentialRampToValueAtTime(180, t + len);
      const g = G(0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, end);
      const gs = G(lvl * 0.7); gs.gain.setValueAtTime(lvl * 0.7, t); gs.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(f); f.connect(g); g.connect(synthBus); sub.connect(gs); gs.connect(synthBus);
    }
    function kick(t, lvl) {
      const o = osc('sine', 150, t, t + 0.4); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      const g = G(0); g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      o.connect(g); g.connect(drumBus);
      padBus.gain.setValueAtTime(0.5, t); padBus.gain.linearRampToValueAtTime(1, t + 0.24);   // synthwave "pump"
    }
    function snare(t, lvl) {
      const n = noiseSrc(t, t + 0.25), f = F('bandpass', 1900, 0.8), g = G(0);
      g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      n.connect(f); f.connect(g); g.connect(drumBus); g.connect(revIn);
      const o = osc('triangle', 190, t, t + 0.12), g2 = G(0); g2.gain.setValueAtTime(lvl * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(g2); g2.connect(drumBus);
    }
    function hat(t, lvl, open) {
      const d = open ? 0.22 : 0.04, n = noiseSrc(t, t + d + 0.02), f = F('highpass', 7600, 0.7), g = G(0);
      g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      n.connect(f); f.connect(g); g.connect(drumBus);
    }
    function crash(t, lvl) {
      const n = noiseSrc(t, t + 1.6), f = F('highpass', 4200, 0.5), g = G(0);
      g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      n.connect(f); f.connect(g); g.connect(drumBus); g.connect(revIn);
    }
    function pluck(m, t, lvl, dur = 0.2, type = 'square', delaySend = 0.5) {
      const end = t + dur + 0.05, o = osc(type, mtof(m), t, end), f = F('lowpass', 4200, 1.2), g = G(0);
      f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
      g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.0008, end);
      o.connect(f); f.connect(g); g.connect(synthBus);
      if (delaySend) { const s = G(delaySend); g.connect(s); s.connect(dIn); }
    }
    function leadNote(m, t, dur, lvl) {
      const end = t + dur + 0.3, o = osc('sawtooth', mtof(m), t, end), o2 = osc('square', mtof(m + 12), t, end);
      o2.detune.setValueAtTime(5, t);
      const f = F('lowpass', 2600, 2), g = G(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.03); g.gain.setValueAtTime(lvl, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, end);
      const g2 = G(0.35); o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(synthBus);
      const s = G(0.45); g.connect(s); s.connect(dIn);
    }
    function fireStab(m, t, lvl) {
      const end = t + 0.32, o = osc('sawtooth', mtof(m), t, end), ws = ctx.createWaveShaper();
      const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 4); } ws.curve = c;
      const f = F('lowpass', 1400, 3), g = G(0); g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.001, end);
      o.connect(ws); ws.connect(f); f.connect(g); g.connect(synthBus);
    }
    function bell(m, t, lvl, dur = 0.7) {
      const end = t + dur, o = osc('sine', mtof(m), t, end), o2 = osc('triangle', mtof(m + 12), t, end);
      const g = G(0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, end);
      const g2 = G(0.25); o2.connect(g2); g2.connect(g); o.connect(g); g.connect(sfx);
      const s = G(0.5); g.connect(s); s.connect(revIn);
    }
    function whoosh(t, lvl, dur, f0, f1, pan0 = 0, pan1 = 0) {
      const n = noiseSrc(t, t + dur + 0.05), f = F('bandpass', f0, 1.4), g = G(0);
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      let last = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur); g.connect(p); last = p; }
      n.connect(f); f.connect(g); last.connect(sfx);
    }

    // ── Zamanlayıcı ──
    const spb = () => 60 / S.bpm / 4;                // 16'lık nota süresi
    function targetBpm() {
      if (S.mode === 'vanilla') return 88;
      if (S.scene !== 'play') return 96;
      return S.mode === 'extreme' ? 126 + 24 * S.eS : 120;   // Chill: eski müzik gibi sabit 120 BPM (yoğunluk katmanları/filtreyi açar)
    }
    function filterTargets(t) {
      let f, pf;
      const boost = t < S.boostUntil;
      if (S.scene === 'dead') { f = 260; pf = 500; }
      else if (S.scene !== 'play') { f = 700; pf = 800; }
      else if (S.mode === 'vanilla') { f = 2400; pf = 1300; }
      else {
        f = 1500 + 5400 * S.eS + 900 * S.combo + (boost ? 3200 : 0) + (S.mode === 'extreme' ? 1600 : 0);
        pf = 800 + 1700 * S.eS + 380 * S.combo;
      }
      musicLP.frequency.setTargetAtTime(Math.min(f, 17000), t, 0.18);
      padLP.frequency.setTargetAtTime(Math.min(pf, 6000), t, 0.25);
    }
    function scheduleStep(t, i) {
      const s = i % 16, bar = Math.floor(i / 16), prog = PROG[S.mode], ch = prog[bar % 4];
      const L = S.layers; L.clear();
      S.eS += (S.inten - S.eS) * 0.06;
      const e = S.eS, x = S.mode === 'extreme', van = S.mode === 'vanilla', play = S.scene === 'play', boost = t < S.boostUntil;
      if (s === 0) {
        S.bpm = targetBpm();
        dly.delayTime.setTargetAtTime(Math.min(1.9, spb() * 3), t, 0.05);
        const lvl = S.scene === 'dead' ? 0.022 : (play ? 0.03 : 0.034);
        for (const m of ch.n) padNote(m, t, spb() * 16, lvl);
        S.chord = ch.name;
      }
      if (S.scene === 'off') return;
      L.add('pad');
      filterTargets(t);
      if (!play) {                                    // menü / oyun sonu: seyrek, boğuk arpej
        if (S.scene === 'menu' && s % 4 === 0) pluck(ch.n[(s / 4) % 3] + 12, t, 0.035, 0.35, 'triangle', 0.6);
        return;
      }
      if (van) {                                      // Vanilla: davulsuz, yumuşak
        if (s % 2 === 0) { const seq = [0, 1, 2, 1, 2, 0, 1, 2]; pluck(ch.n[seq[(s / 2) % 8]] + 12, t, 0.06, 0.4, 'triangle', 0.5); L.add('arp'); }
        if (s === 0 || s === 8) { bass(ch.b, t, spb() * 7, 0.12, 0.1); L.add('bass'); }
        return;
      }
      if (s % 4 === 0) kick(t, x ? 0.95 : 0.85);     // kick run'ın ilk anından her vuruşta (2026-11-09)
      L.add('kick');
      if (e > 0.22 || x) {
        if (x) { const m = (s % 4 === 2) ? ch.b + 12 : ch.b; bass(m, t, spb() * 0.9, s % 4 === 0 ? 0.24 : 0.17, 0.35 + e * 0.5); }
        else if (e > 0.62) { if (s % 2 === 0) bass(s % 4 === 2 ? ch.b + 12 : ch.b, t, spb() * 1.6, 0.2, 0.25 + e * 0.4); }
        else if (s % 4 === 0 || s % 4 === 3) bass(ch.b, t, spb() * 1.8, 0.2, 0.2);
        L.add('bass');
      }
      if (e > 0.35 || x || boost) {
        if (s % 4 === 2) hat(t, 0.09, x && s === 14);
        if ((e > 0.72 || x || boost) && s % 2 === 1) hat(t, 0.045, false);
        L.add('hats');
      }
      if (e > 0.45 || x) { if (s === 4 || s === 12) snare(t, x ? 0.3 : 0.24); L.add('snare'); }
      if (S.combo >= 1) {
        const tones = [ch.n[0], ch.n[1], ch.n[2], ch.n[1] + 12, ch.n[2] + 12, ch.n[0] + 12];
        const every = S.combo >= 2 ? 1 : 2;
        if (s % every === 0) { const m = tones[(s / every) % tones.length] + 12; pluck(m, t, S.combo >= 3 ? 0.06 : 0.05, 0.16, 'square', 0.55); }
        L.add('arp');
      }
      if (S.combo >= 3 && s % 4 === 0) {
        const m = LEAD[((bar % 2) * 4 + s / 4) % LEAD.length];
        leadNote(m, t, spb() * 3.5, 0.05); L.add('lead');
      }
      if (x && e > 0.55) {
        if (s === 0 || s === 6 || s === 10) fireStab(ch.b, t, 0.11);
        if (s === 0 && bar % 4 === 0) crash(t, 0.12);
        L.add('fire');
      }
      if (boost) { if (s % 2 === 0) pluck(ch.n[(s / 2) % 3] + 24, t, 0.03, 0.08, 'sawtooth', 0.3); L.add('boost'); }
    }
    function advance(until) {
      while (S.next < until) { scheduleStep(S.next, S.step); S.step++; S.next += spb(); }
    }
    function startTimer() {
      if (opts.offline || S.timer) return;
      S.timer = setInterval(() => advance(ctx.currentTime + 0.12), 25);
    }
    const now = at => (at == null ? ctx.currentTime : at);

    // ── Dış arayüz ──
    const api = {
      ctx, analyser, advance,
      state: () => ({ scene: S.scene, mode: S.mode, bpm: S.bpm, eS: S.eS, inten: S.inten, combo: S.combo, chain: S.chain, chord: S.chord, layers: [...S.layers], boost: ctx.currentTime < S.boostUntil }),
      menu(at) {
        const t = now(at);
        if (S.scene === 'off') { S.next = t + 0.05; S.step = 0; }
        S.scene = 'menu'; S.combo = 0; S.chain = 0;
        music.gain.cancelScheduledValues(t); music.gain.setTargetAtTime(0.8, t, 0.4);
        startTimer();
      },
      start(mode, at) {
        const t = now(at);
        if (mode) S.mode = mode;
        if (S.scene === 'off') { S.next = t + 0.05; S.step = 0; }
        S.scene = 'play'; S.combo = 0; S.chain = 0; S.boostUntil = 0;
        if (S.step % 16) { S.step += 16 - (S.step % 16); }            // yeni run yeni ölçüden başlar
        music.gain.cancelScheduledValues(t); music.gain.setTargetAtTime(1, t, 0.15);
        startTimer();
      },
      stop(at) {
        const t = now(at); S.scene = 'off';
        music.gain.cancelScheduledValues(t); music.gain.setTargetAtTime(0, t, 0.3);
        if (S.timer) { clearInterval(S.timer); S.timer = null; }
      },
      setMode(m) { if (PROG[m]) S.mode = m; },
      setMusicEnabled(on, at) { musicVol.gain.setTargetAtTime(typeof on === 'number' ? Math.max(0, Math.min(1, on)) : (on ? 1 : 0), now(at), 0.05); },   // true/false ya da 0..1 ses seviyesi
      setSfxEnabled(on, at) { sfx.gain.setTargetAtTime(0.9 * (typeof on === 'number' ? Math.max(0, Math.min(1, on)) : (on ? 1 : 0)), now(at), 0.02); },
      setIntensity(v) { S.inten = Math.max(0, Math.min(1, v)); },
      setCombo(l) { S.combo = Math.max(0, Math.min(3, l | 0)); },
      tap(dir = 1, at) {
        const t = now(at), ch = PROG[S.mode][Math.floor(S.step / 16) % 4];
        const o = osc('sine', mtof(ch.n[0] + 24 + (dir > 0 ? 7 : 0)), t, t + 0.07), g = G(0);
        g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.06); o.connect(g); g.connect(sfx);
        const n = noiseSrc(t, t + 0.02), f = F('highpass', 3000), g2 = G(0.05); g2.gain.setValueAtTime(0.05, t); g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.015);
        n.connect(f); f.connect(g2); g2.connect(sfx);
      },
      collect(at) {
        const t = now(at), idx = S.chain++, m = 69 + PENTA[idx % 5] + 12 * (Math.floor(idx / 5) % 2);
        bell(m, t, 0.26, 0.6); pluck(m + 12, t, 0.03, 0.12, 'triangle', 0.4);
        return S.chain;
      },
      gold(at) { const t = now(at); bell(88, t, 0.22, 0.8); bell(93, t + 0.07, 0.2, 0.9); bell(100, t + 0.14, 0.1, 0.9); },
      comboBreak(at) {
        const t = now(at); S.chain = 0; S.combo = 0;
        const o = osc('sawtooth', mtof(81), t, t + 0.42); o.frequency.exponentialRampToValueAtTime(mtof(57), t + 0.38);
        const f = F('lowpass', 3000, 3); f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.4);
        const g = G(0); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        o.connect(f); f.connect(g); g.connect(sfx);
        whoosh(t, 0.1, 0.18, 6000, 1200);
        musicLP.frequency.cancelScheduledValues(t); musicLP.frequency.setTargetAtTime(450, t, 0.03);
      },
      nearMiss(at) { const t = now(at); whoosh(t, 0.22, 0.28, 500, 5200, -0.7, 0.7); },
      booster(dur = 5, at) {
        const t = now(at); S.boostUntil = t + dur;
        const o = osc('sawtooth', 180, t, t + 0.6); o.frequency.exponentialRampToValueAtTime(1400, t + 0.55);
        const f = F('bandpass', 900, 2), g = G(0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.connect(f); f.connect(g); g.connect(sfx); whoosh(t, 0.1, 0.55, 400, 6000);
      },
      death(at) {
        const t = now(at); S.scene = 'dead'; S.combo = 0; S.chain = 0; S.boostUntil = 0; S.deadAt = t;
        const o = osc('sine', 95, t, t + 0.8); o.frequency.exponentialRampToValueAtTime(26, t + 0.7);
        const g = G(0); g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.75); o.connect(g); g.connect(sfx);
        const n = noiseSrc(t, t + 0.7), f = F('lowpass', 2400, 0.7), g2 = G(0);
        f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(160, t + 0.6);
        g2.gain.setValueAtTime(0.35, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.65); n.connect(f); f.connect(g2); g2.connect(sfx); g2.connect(revIn);
        const gl = osc('square', 220, t, t + 0.5); gl.frequency.exponentialRampToValueAtTime(55, t + 0.45);
        const g3 = G(0); g3.gain.setValueAtTime(0.06, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.48); gl.connect(g3); g3.connect(sfx);
        music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(music.gain.value || 1, t); music.gain.setTargetAtTime(0.32, t, 0.25);
        musicLP.frequency.cancelScheduledValues(t); musicLP.frequency.setTargetAtTime(240, t, 0.12);
      },
      revive(at) {
        const t = now(at);
        whoosh(t, 0.16, 0.85, 200, 7000); const o = osc('sawtooth', 110, t, t + 0.9); o.frequency.exponentialRampToValueAtTime(880, t + 0.85);
        const f = F('lowpass', 2000, 2), g = G(0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        o.connect(f); f.connect(g); g.connect(sfx);
        S.scene = 'play';
        music.gain.cancelScheduledValues(t); music.gain.setTargetAtTime(1, t + 0.6, 0.2);
        crash(t + 0.85, 0.1);
      },
    };
    return api;
  }
  return { create };
})();
if (typeof window !== 'undefined') window.ArcMusic = ArcMusic;
