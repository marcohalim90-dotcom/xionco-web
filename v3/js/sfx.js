/* ==========================================================================
   XIONCO v3 — SFX
   Semua suara disintesis dengan Web Audio (tanpa file). Aktif setelah
   interaksi pertama pengguna (aturan browser). Bisa dimatikan (tombol / M).
   ========================================================================== */
(function () {
  'use strict';
  var S = window.SFX = { on: true, ready: false };
  var ctx = null, master = null, noiseBuf = null, lastHover = 0;
  try { var saved = localStorage.getItem('xv3_sfx'); if (saved !== null) S.on = saved === '1'; } catch (e) {}

  function boot() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    try { ctx = new A(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = .16;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    S.ready = true;
    return ctx;
  }
  S.unlock = boot;
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { boot(); }, { passive: true });
  });
  S.toggle = function (v) {
    S.on = v === undefined ? !S.on : !!v;
    try { localStorage.setItem('xv3_sfx', S.on ? '1' : '0'); } catch (e) {}
    if (S.on) { boot(); S.select(); }
    return S.on;
  };

  function ok() { return S.on && ctx && ctx.state === 'running'; }

  // nada sederhana dengan envelope
  function tone(freq, dur, type, gain, delay, freqTo) {
    if (!ok()) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || .2, t + .008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .02);
  }
  // desis tersaring (whoosh, klik)
  function noise(dur, gain, f1, f2, q, delay) {
    if (!ok()) return;
    var t = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(f2 || f1, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * .25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }

  S.hover = function () {
    var n = performance.now();
    if (n - lastHover < 45) return;
    lastHover = n;
    tone(2100, .035, 'square', .035);
  };
  S.tick = function () { tone(1400, .03, 'square', .03); };
  S.select = function () { tone(660, .07, 'triangle', .22); tone(990, .1, 'triangle', .2, .06); };
  S.back = function () { tone(620, .07, 'triangle', .18); tone(410, .12, 'triangle', .16, .06); };
  S.open = function () { tone(220, .22, 'sawtooth', .07, 0, 880); noise(.22, .08, 600, 3200, 2); };
  S.close = function () { tone(700, .18, 'sawtooth', .05, 0, 200); };
  S.whoosh = function () { noise(.5, .22, 300, 4200, .9); tone(90, .35, 'sine', .18, 0, 45); };
  S.coin = function () { tone(988, .08, 'square', .12); tone(1319, .28, 'square', .12, .075); };
  S.error = function () { tone(150, .18, 'square', .12); tone(120, .2, 'square', .1, .09); };
  S.type = function () { noise(.02, .05, 3500, 2500, 6); };
  S.buzz = function () { tone(58, .16, 'sawtooth', .06); noise(.12, .04, 4000, 3000, 3); };
  S.start = function () {
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, .5 - i * .05, 'triangle', .16, i * .07); });
    noise(.9, .12, 200, 6000, .7);
  };
  S.ach = function () {
    [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, .22, 'square', .08, i * .08); });
    tone(1568, .6, 'triangle', .12, .32);
  };
  S.count = function (last) { tone(last ? 220 : 880, last ? .4 : .06, 'square', .08); };
  S.build = function () { noise(.35, .16, 180, 1800, 1.5); tone(330, .1, 'square', .08, .2); tone(495, .14, 'square', .08, .28); };
})();
