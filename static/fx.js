/*!
 * fx.js — page-effects engine for gustaf-web.
 *
 * Ported from design/tuner.html (the approved single-file transition tuner) into an engine
 * that drives real pages via window.FX.transition()/show()/coldStart(), per
 * design/site/CONTRACT.md. Search tuner.html for the names in these comments if you need the
 * original fixed-scene version to compare against.
 *
 * Owns exactly one file. No other file is touched from here. Injects its own <style>, creates
 * its own canvas + CRT glass DOM. Classic script, no modules, works from file://.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------
  // grain texture (Kodak Gold 200, 256x256 grey tile). The design/site/ mockup had to inline
  // this as a base64 data URI so WebGL's texImage2D never touched a file:// <img> (Chrome
  // treats those as cross-origin for WebGL); the real site is same-origin, so it's a plain
  // same-origin asset URL instead.
  // ---------------------------------------------------------------------------------------
  var GOLD200 = '/assets/gold200-grain.png';

  // ---------------------------------------------------------------------------------------
  // easing — identical table to tuner.html's EASES
  // ---------------------------------------------------------------------------------------
  var EASES = {
    linear: function (k) { return k; },
    'in quad': function (k) { return k * k; },
    'in cubic': function (k) { return k * k * k; },
    'out quad': function (k) { return 1 - (1 - k) * (1 - k); },
    'out cubic': function (k) { return 1 - Math.pow(1 - k, 3); },
    'out expo': function (k) { return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); },
    'in-out sine': function (k) { return -(Math.cos(Math.PI * k) - 1) / 2; },
    'in-out cubic': function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  };
  function ease(name, k) { var f = EASES[name]; return f ? f(k) : k; }

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  // matchMedia throws in some older/embedded browsers for an unrecognised media feature —
  // treat that the same as "no reduced-motion preference" rather than letting it propagate.
  function prefersReducedMotion() {
    try { return !!matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // deterministic PRNG — identical to tuner.html's rng()
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var PAIRS = {
    'red / cyan': ['255,40,60', '0,220,255'],
    'yellow / blue': ['255,230,0', '60,60,255'],
    'magenta / green': ['255,0,200', '0,255,120']
  };

  // ---------------------------------------------------------------------------------------
  // settings — schema defaults (tuner.html SCHEMA array defaults), overridden by whatever is
  // passed into FX.init(). Tuner-only keys (scene, noCssBlur, noGrain, textBlurHow, mode,
  // seed, split) are accepted if present but never consulted: splitting is markup-driven
  // (data-nosplit), blur is always text-shadow, dissolve unit is always per-element, and the
  // seed is re-rolled fresh every transition.
  // ---------------------------------------------------------------------------------------
  var SCHEMA_DEFAULTS = {
    outMs: 380, holdMs: 0, inMs: 640, outEase: 'in quad', inEase: 'out cubic',
    grainScale: 1, grainMix: 0.45, coarse: 140, patchRel: true, soft: 0.07, smooth: false,
    sweep: 0, sweepAngle: 90,
    blurOut: 4, blurIn: 6, textBlur: 1, imgBlur: 1, fade: 0, drift: 0, scale: 1,
    spread: 0.45, order: 'structure → text → images', mirrorOut: true, orderRand: 0.35,
    jitter: 0.35, sizeSpeed: 0, halo: 0.5, tail: 0.45,
    tint: '#A3B18A', tintAmt: 0,
    vcr: 0, vcrCol: '#D02BD6', vcrWidth: 1.5, vcrJag: 4, vcrPeak: 'mid-transition',
    chroma: 0, chromaPair: 'red / cyan',
    scan: 0, scanGap: 3, roll: 0, rollH: 70, rollSpeed: 260, snow: 0.5, tear: 0,
    crt: 'off', crtCurve: 0.6, crtRadius: 36, crtWarp: 0, crtScan: 0.45, crtScanGap: 3,
    crtMask: 0.35, crtMaskType: 'aperture grille', crtGlow: 0.3, crtFlicker: 0.15,
    crtPower: false, crtRead: 0.25, crtNav: 1, photosClean: true, photoReveal: 'interlaced',
    coldMs: 2400, coldLine: 0.16, coldDelay: 0.05, coldDim: 0.12, coldBlur: 4,
    coldConverge: 5, coldBloom: 1.4, coldStagger: 0.3, coldEase: 'out cubic',
    touch: false, idleGlitch: true, idleMin: 9000, idleMax: 24000, idleAmt: 1, idleOnEnter: true, idleEnterDelay: 2000,
    coldPowerLine: false, powerSwitch: false
  };

  var S = null;           // merged settings, set by init()
  var LITE = false;
  var REVEAL_MODE = 'interlaced'; // photoReveal setting, resolved once at init() — see photoRevealMode()

  // ---------------------------------------------------------------------------------------
  // injected CSS — ported from tuner.html's <style> (the .u / .u.ph::after / #crt rules and
  // @keyframes flick). z-index values follow CONTRACT.md's layering table, not tuner's.
  // ---------------------------------------------------------------------------------------
  var CSS = ''
    + '.u { display: inline-block; white-space: pre; padding: .28em .08em; margin: -.28em -.08em; position: relative; }\n'
    + '.u.ph { color: transparent !important; }\n'
    + '.u.ph::after { content: attr(data-text); position: absolute; inset: 0; padding: inherit; white-space: pre;\n'
    + '  color: transparent; text-shadow: none; background-image: var(--ph); -webkit-background-clip: text; background-clip: text; }\n'
    + '.fx-rseg { flex: 1; height: 1px; background: var(--border); display: block; }\n'
    + '#fx-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 60; }\n'
    + '#fx-crt { position: fixed; inset: 0; pointer-events: none; display: none; z-index: 6; }\n'
    // [data-fx-glass] overlays (the photo viewer): the tube's curved edge + vignette only, no
    // scanlines, no warp — the photo and text inside stay sharp and readable.
    + '.fx-glass { position: absolute; inset: 0; pointer-events: none; z-index: 3; }\n'
    + '.fx-glass i { position: absolute; inset: 0; display: block; border-radius: var(--crt-r, 0); }\n'
    + '#fx-crt i { position: absolute; inset: 0; display: block; border-radius: var(--crt-r, 0); opacity: var(--crt-on, 1); }\n'
    + '#fx-crt .fx-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,var(--crt-scan)) 0 1px, transparent 1px var(--crt-gap)); }\n'
    + '#fx-crt .fx-vig, .fx-glass .fx-vig { background:\n'
    + '    radial-gradient(ellipse at 32% 18%, rgba(255,255,255,calc(var(--crt-curve) * .05)), transparent 45%),\n'
    + '    radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,calc(var(--crt-curve) * .75)) 100%);\n'
    + '  box-shadow: inset 0 0 calc(var(--crt-curve) * 90px) rgba(0,0,0,calc(var(--crt-curve) * .85)); }\n'
    + '#fx-crt .fx-bezel, .fx-glass .fx-bezel { box-shadow: 0 0 0 400px #050505; }\n'
    + '#fx-crt .fx-flick { background: #fff; opacity: 0; animation: fx-flick 90ms steps(2) infinite; }\n'
    + '@keyframes fx-flick { 0% { opacity: 0; } 50% { opacity: calc(var(--crt-flick) * var(--crt-on, 1)); } }\n'
    + '@media (prefers-reduced-motion: reduce) { #fx-crt .fx-flick { animation: none; } }\n'
    // -------------------------------------------------------------------------------------
    // task 2 — hover: replaces the browser underline on FX-split links/buttons with a CRT
    // "phosphor excite" word-glow plus a proper glow-line under the link (amendment). Colours
    // come from --fx-glow-color, a token site.css sets per link context (default var(--sage)).
    // Pure CSS: never touches the inline text-shadow FX sets at rest (no !important, no
    // transition on text-shadow — FX animates that per frame during page transitions and a
    // transition would smear it; a CSS Animation already outranks the inline value while it's
    // running, so no !important is needed).
    // -------------------------------------------------------------------------------------
    + 'a:hover:has(.u), a:focus-visible:has(.u) { text-decoration: none; }\n'
    + '@keyframes fx-excite {\n'
    + '  0%   { text-shadow: 0 0 0 transparent; }\n'
    + '  12%  { text-shadow: -.6px 0 2px rgba(255,40,60,.55), .6px 0 2px rgba(0,220,255,.55), 0 0 14px var(--fx-glow-color); }\n'
    + '  28%  { text-shadow: .6px 0 2px rgba(255,40,60,.4), -.6px 0 2px rgba(0,220,255,.4), 0 0 10px var(--fx-glow-color); }\n'
    + '  100% { text-shadow: 0 0 7px var(--fx-glow-color); }\n'
    + '}\n'
    + 'a:hover .u, a:focus-visible .u, button:hover .u, button:focus-visible .u { animation: fx-excite 220ms ease-out forwards; }\n'
    + 'html.fx-transitioning a:hover .u, html.fx-transitioning a:focus-visible .u,\n'
    + 'html.fx-transitioning button:hover .u, html.fx-transitioning button:focus-visible .u { animation: none; }\n'
    + '@media (prefers-reduced-motion: reduce) {\n'
    + '  a:hover .u, a:focus-visible .u, button:hover .u, button:focus-visible .u { animation: none; text-shadow: 0 0 7px var(--fx-glow-color); }\n'
    + '}\n'
    // the underline-replacement glow-line (amendment to task 2): drawn under the words
    // themselves (links sit below the CRT glass, z 6, so scanlines passing over it is on-theme).
    // Bug: one straight line on the <a> stayed put while each .u got its own barrel-warp
    // matrix3d, so near the curved top edge the words slid right/down and the line cut through
    // them. Now each word draws its own segment as .u::before (inside the warped box, so it bends
    // with the word); every word but the last reaches 1ch right to bridge the unwarped space.
    // .u box = text + padding .28em .08em, so the content edge is .08em in / .28em up.
    // Ledger rows are excluded: they already highlight with a row background.
    + 'a:not(.lrow) .u::before { content: ""; position: absolute; left: .08em; right: .08em; bottom: calc(.28em - 3px); height: 1px;\n'
    + '  background: color-mix(in srgb, var(--fx-glow-color) 70%, transparent);\n'
    + '  box-shadow: 0 0 6px 0 color-mix(in srgb, var(--fx-glow-color) 60%, transparent);\n'
    + '  opacity: 0; pointer-events: none; }\n'
    + 'a:not(.lrow) .u:not(:last-of-type)::before { right: calc(.08em - 1ch); }\n'
    + 'a:not(.lrow):hover .u::before, a:not(.lrow):focus-visible .u::before { animation: fx-underline 160ms steps(1) forwards; }\n'
    + 'html.fx-transitioning a:hover .u::before, html.fx-transitioning a:focus-visible .u::before { animation: none; opacity: 0; }\n'
    + '@keyframes fx-underline { 0% { opacity: 0; } 35% { opacity: .9; } 55% { opacity: .5; } 100% { opacity: 1; } }\n'
    + '@media (prefers-reduced-motion: reduce) { a:not(.lrow):hover .u::before, a:not(.lrow):focus-visible .u::before { animation: none; opacity: 1; } }\n'
    // -------------------------------------------------------------------------------------
    // task 10 — a soft CRT glow around a photo on hover/focus (box-shadow only, see site.css
    // for the colour/timing; this just makes sure it is suppressed mid-transition, same rule
    // as the link hover above).
    // -------------------------------------------------------------------------------------
    + 'html.fx-transitioning .tile:hover img, html.fx-transitioning .doc figure:hover img { box-shadow: none; }\n'
    // -------------------------------------------------------------------------------------
    // task 8 — power switch (always present, bottom-right, drawn in CSS: a circle outline with
    // the IEC power-symbol notch) and the retro power-on button shown over the dark screen
    // while off. Both sit above the grain canvas (z 60) and the CRT glass (z 6) — never inside
    // the tube effects.
    // -------------------------------------------------------------------------------------
    + '#fx-power { position: fixed; right: 20px; bottom: 18px; z-index: 65; width: 28px; height: 28px;\n'
    + '  background: none; border: 0; padding: 0; cursor: pointer; }\n'
    + '#fx-power::before { content: ""; position: absolute; inset: 2px; border: 1.4px solid #3a3a3a; border-radius: 50%; }\n'
    + '#fx-power::after { content: ""; position: absolute; left: 50%; top: 2px; width: 0; height: 7px;\n'
    + '  border-left: 1.4px solid #3a3a3a; transform: translateX(-50%); }\n'
    + '#fx-power:hover::before, #fx-power:focus-visible::before,\n'
    + '#fx-power:hover::after, #fx-power:focus-visible::after { border-color: #8A8A8A; }\n'
    + '#fx-power-on { position: fixed; inset: 0; z-index: 61; display: flex; flex-direction: column;\n'
    + '  align-items: center; justify-content: center; gap: 10px; background: #000; opacity: 0; pointer-events: none;\n'
    + '  transition: opacity 240ms ease-out; }\n'
    + '#fx-power-on.on { opacity: 1; pointer-events: auto; }\n'
    + '#fx-power-btn { width: 56px; height: 56px; border-radius: 50%; cursor: pointer; position: relative;\n'
    + '  border: 1px solid #060606; background: radial-gradient(circle at 35% 30%, #3a3a3a, #111 70%);\n'
    + '  box-shadow: inset 0 2px 3px rgba(255,255,255,.12), inset 0 -3px 5px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.04); }\n'
    + '#fx-power-btn::before { content: ""; position: absolute; inset: 15px; border: 1.4px solid #8A8A8A; border-radius: 50%; }\n'
    + '#fx-power-btn::after { content: ""; position: absolute; left: 50%; top: 15px; width: 0; height: 8px;\n'
    + '  border-left: 1.4px solid #8A8A8A; transform: translateX(-50%); }\n'
    + '#fx-power-btn:hover, #fx-power-btn:focus-visible { background: radial-gradient(circle at 35% 30%, #484848, #161616 70%); }\n'
    + '#fx-power-led { position: absolute; left: -11px; top: 50%; width: 4px; height: 4px; border-radius: 50%;\n'
    + '  background: #4a1414; box-shadow: 0 0 2px rgba(200,40,40,.4); transform: translateY(-50%); }\n'
    + '#fx-power-label { font-family: ' + "'Red Hat Mono', ui-monospace, monospace" + '; font-size: 11px; color: #5A5A5A; letter-spacing: .04em; }\n'
    + 'html.fx-off main.page { pointer-events: none; }\n'
    // -------------------------------------------------------------------------------------
    // photo reveal — stage visuals on .frame::before (photos.js owns the markup/data-load,
    // this owns how each stage looks; see startDevelop below for the per-mode reveal itself).
    // Keyed on html[data-reveal] (the photoReveal setting, overridable by ?reveal=) and
    // .frame[data-load]. ::before sits under the <img> (document order, both position:static
    // except where applyPhotosZ lifts the img to z:7 on photo pages) so it only shows while
    // the img above it has nothing to paint (no src yet, or still its pre-reveal hidden state).
    // Once revealed, ::before is fully off — no animation, nothing left to clean up.
    // -------------------------------------------------------------------------------------
    + '.frame::before { content: ""; position: absolute; inset: 0; pointer-events: none; }\n'
    + '.frame[data-revealed]::before { display: none !important; }\n'
    // interlaced — "no signal": static interlace lines, a dim tint of the photo colour (or
    // neutral) behind them, the same while queued and while loading (no rolling band — cut).
    + 'html[data-reveal="interlaced"] .frame::before {\n'
    + '  background-color: color-mix(in srgb, var(--ph-c, #181818) 18%, #121212);\n'
    + '  background-image: repeating-linear-gradient(to bottom,\n'
    + '    color-mix(in srgb, var(--ph-c, #262626) 35%, #161616) 0 1px, transparent 1px 2px);\n'
    + '}\n'
    // darkroom — queued: almost-black flat tint. "safelight": a faint warm-red glow breathing
    // while the src is in flight. The develop-out-of-black curve itself is revealDarkroom().
    + 'html[data-reveal="darkroom"] .frame::before {\n'
    + '  background-color: color-mix(in srgb, var(--ph-c, #141414) 12%, #0f0f0f);\n'
    + '}\n'
    + 'html[data-reveal="darkroom"] .frame[data-load="loading"]::before {\n'
    + '  background-image: radial-gradient(circle at 50% 50%, rgba(170,40,20,.07), transparent 70%);\n'
    + '  animation: fx-safelight 2.4s ease-in-out infinite;\n'
    + '}\n'
    + '@keyframes fx-safelight { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }\n'
    // grain (today's reveal, unchanged) — just a flat placeholder. Fixes a real bug: the old
    // site.css rule (background on img, cleared the instant [src] landed) left a dark gap
    // between src-set and the grain condense-in actually starting; this placeholder instead
    // stays up — via ::before, never touching the img — until data-revealed turns it off.
    + 'html[data-reveal="grain"] .frame::before { background-color: var(--surface); }\n'
    // lite mode never runs per-frame work, in any reveal mode; same for reduced-motion.
    + 'html.fx-lite .frame[data-load="loading"]::before { animation: none; }\n'
    + '@media (prefers-reduced-motion: reduce) { .frame[data-load="loading"]::before { animation: none; } }\n';

  function injectStyle() {
    var el = document.createElement('style');
    el.id = 'fx-style';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ---------------------------------------------------------------------------------------
  // DOM: canvas + CRT glass
  // ---------------------------------------------------------------------------------------
  var canvas, crtRoot;
  function createDom() {
    canvas = document.createElement('canvas');
    canvas.id = 'fx-canvas';
    document.body.appendChild(canvas);
    [].forEach.call(document.querySelectorAll('[data-fx-glass]'), function (host) {
      var g = document.createElement('div');
      g.className = 'fx-glass'; g.setAttribute('aria-hidden', 'true');
      g.style.setProperty('--crt-curve', S.crtCurve); g.style.setProperty('--crt-r', S.crtRadius + 'px');
      g.innerHTML = '<i class="fx-vig"></i><i class="fx-bezel"></i>';
      host.appendChild(g);
    });
    crtRoot = document.createElement('div');
    crtRoot.id = 'fx-crt';
    crtRoot.setAttribute('aria-hidden', 'true');
    // no flicker element at all when crtFlicker is 0: its infinite keyframe would run at rest
    crtRoot.innerHTML = '<i class="fx-scan"></i><i class="fx-vig"></i>' + (S.crtFlicker > 0 ? '<i class="fx-flick"></i>' : '') + '<i class="fx-bezel"></i>';
    document.body.appendChild(crtRoot);
  }

  // task 8 — power switch (always present, every page, even lite mode) + the retro power-on
  // button shown while off. Built here, not in index.html: like the canvas/CRT glass, these
  // are FX's own effect chrome, not site content.
  var powerSwitchBtn, powerOnOverlay, powerOnBtn;
  function createPowerDom() {
    powerSwitchBtn = document.createElement('button');
    powerSwitchBtn.id = 'fx-power'; powerSwitchBtn.type = 'button';
    powerSwitchBtn.setAttribute('aria-label', 'turn the screen off');
    document.body.appendChild(powerSwitchBtn);

    powerOnOverlay = document.createElement('div');
    powerOnOverlay.id = 'fx-power-on'; powerOnOverlay.setAttribute('aria-hidden', 'true');
    powerOnBtn = document.createElement('button');
    powerOnBtn.id = 'fx-power-btn'; powerOnBtn.type = 'button';
    powerOnBtn.setAttribute('aria-label', 'turn the screen on');
    var led = document.createElement('span'); led.id = 'fx-power-led';
    powerOnBtn.appendChild(led);
    var label = document.createElement('div'); label.id = 'fx-power-label'; label.textContent = 'power';
    powerOnOverlay.appendChild(powerOnBtn);
    powerOnOverlay.appendChild(label);
    document.body.appendChild(powerOnOverlay);

    powerSwitchBtn.addEventListener('click', function () { powerOff(currentPage); });
    powerOnBtn.addEventListener('click', function () { powerOn(); });
    document.addEventListener('keydown', function (e) { if (isOff && e.key === 'Escape') powerOn(); });
  }

  function setGlassLevel(level) {
    if (!crtRoot) return;
    crtRoot.style.display = level > 0.001 ? 'block' : 'none';
    crtRoot.style.setProperty('--crt-on', level);
    crtRoot.style.setProperty('--crt-r', (S.crtRadius * level) + 'px');
    crtRoot.style.setProperty('--crt-scan', S.crtScan * 0.55);
    crtRoot.style.setProperty('--crt-gap', S.crtScanGap + 'px');
    crtRoot.style.setProperty('--crt-mask', S.crtMask);
    crtRoot.style.setProperty('--crt-curve', S.crtCurve);
    crtRoot.style.setProperty('--crt-flick', S.crtFlicker * 0.05);
  }

  // ---------------------------------------------------------------------------------------
  // WebGL — vertex + fragment shaders are byte-identical to tuner.html's program (modes
  // 0 grain dissolve, 1 VCR tracking line, 2 scanlines/roll/static, 3 CRT power line).
  // ---------------------------------------------------------------------------------------
  var gl = null, U = null, tex = null, gim = null;
  function sh(gl, t, src) {
    var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[fx] shader', gl.getShaderInfoLog(s));
    return s;
  }
  function createGL() {
    canvas.getContext && (gl = canvas.getContext('webgl', { antialias: false }));
    if (!gl) return false;
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl, gl.VERTEX_SHADER,
      'attribute vec2 q; uniform vec4 quad; uniform vec2 res; varying vec2 spx;\n' +
      'void main(){ spx = quad.xy + q * quad.zw; vec2 c = spx / res * 2. - 1.; gl_Position = vec4(c.x, -c.y, 0, 1); }'));
    gl.attachShader(prog, sh(gl, gl.FRAGMENT_SHADER,
      'precision highp float;\n' +
      'varying vec2 spx; uniform sampler2D grainTex; uniform vec4 rect;\n' +
      'uniform float warpK, lineAmt, lineW, lineH; uniform vec2 wc, wh;\n' +
      'uniform float p, seed, grainScale, grainMix, coarse, soft, sweep, tintAmt, pad; uniform vec2 dir; uniform vec3 tint;\n' +
      'uniform int mode; uniform float vAmt, vX, vWidth, vJag, vTime; uniform vec3 vCol;\n' +
      'uniform float scanAmt, scanGap, rollAmt, barY, barH, snowAmt;\n' +
      'uniform vec2 touchPos; uniform float touchR, touchAmt, touchBloomA, touchRingA, touchStaticA, touchTime;\n' +
      'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);\n' +
      '  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+1.), f.x), f.y); }\n' +
      'void main(){\n' +
      '  vec2 nn = (spx - wc) / wh; float r2 = dot(nn, nn);\n' +
      '  vec2 px = spx + wh * warpK * nn * r2;\n' +
      // task 11 — the "finger on the screen" touch effect: a soft additive bloom at the
      // pointer, a thin hue-sweeping ring at .8x radius (the magnetic colour fringe a finger
      // leaves on a CRT), and sparse re-rolling static inside the bloom. Drawn as its own
      // full-screen quad pass (see drawTouch below), independent of any text/image rect.
      '  if (mode == 4) {\n' +
      '    vec2 dd = spx - touchPos; float rr = length(dd) / max(touchR, 1.);\n' +
      '    float bloom = exp(-rr * rr * 2.2) * touchBloomA * touchAmt;\n' +
      '    float ring = exp(-pow((rr - .8) / .12, 2.)) * touchRingA * touchAmt;\n' +
      '    float hue = atan(dd.y, dd.x) / 6.2831853 + touchTime * .15;\n' +
      '    vec3 rainbow = .5 + .5 * cos(6.2831853 * (hue + vec3(0., .3333, .6667)));\n' +
      '    float sn2 = h(floor(spx * .5) + floor(touchTime * 24.) * 13.7);\n' +
      '    float sparkle = step(.985, sn2) * touchStaticA * touchAmt * smoothstep(1., .2, rr);\n' +
      '    vec3 col = vec3(.93) * bloom + rainbow * ring + vec3(1.) * sparkle;\n' +
      '    float al = clamp(bloom + ring * .6 + sparkle, 0., 1.);\n' +
      '    gl_FragColor = vec4(col, al);\n' +
      '    return;\n' +
      '  }\n' +
      '  if (mode == 3) {\n' +
      '    float dy = (spx.y - wc.y) / max(lineH, .5), dx = abs(spx.x - wc.x) / max(lineW, .5);\n' +
      '    float a = exp(-dy * dy) * (1. - smoothstep(.85, 1., dx)) * lineAmt;\n' +
      '    gl_FragColor = vec4(vec3(.92, .96, 1.) * a, a);\n' +
      '    return;\n' +
      '  }\n' +
      '  if (mode == 0 && (px.x < rect.x || px.y < rect.y || px.x > rect.x + rect.z || px.y > rect.y + rect.w)) discard;\n' +
      '  if (mode == 1) {\n' +
      '    float band = floor(px.y / 6.);\n' +
      '    float wob = (h(vec2(band, floor(vTime * 24.))) - .5) * vJag;\n' +
      '    float d = abs(px.x - vX - wob);\n' +
      '    float line = smoothstep(vWidth, 0., d) * (.75 + .25 * h(vec2(band * 3.1, vTime)));\n' +
      '    float drop = step(.12, h(vec2(floor(px.y / 40.), floor(vTime * 12.))));\n' +
      '    float al = line * drop * vAmt;\n' +
      '    gl_FragColor = vec4(vCol * al, al);\n' +
      '    return;\n' +
      '  }\n' +
      '  if (mode == 2) {\n' +
      '    float sl = scanAmt * .55 * (.5 + .5 * cos(6.2831853 * px.y / scanGap));\n' +
      '    float d = (px.y - barY) / barH, bar = exp(-d * d * 4.) * rollAmt;\n' +
      '    float sn = h(floor(px * vec2(.5, 1.)) + floor(vTime * 60.) * 13.7);\n' +
      '    float w = bar * snowAmt * step(.62, sn) * sn + bar * .07;\n' +
      '    gl_FragColor = vec4(vec3(w), clamp(sl + w * (1. - sl), 0., 1.));\n' +
      '    return;\n' +
      '  }\n' +
      '  float g = texture2D(grainTex, (px / grainScale + seed * 37.) / 256.).r;\n' +
      '  float c = vn((px + seed * 101.) / coarse);\n' +
      '  float n = grainMix * g + (1. - grainMix) * c;\n' +
      '  vec2 l = (px - rect.xy) / max(rect.zw, vec2(1.));\n' +
      '  float ramp = clamp(dot(l - .5, dir) + .5, 0., 1.);\n' +
      '  n = mix(n, .7 * ramp + .3 * g, sweep);\n' +
      '  float e = p * (1. + 2. * soft + .1) - soft - .05;\n' +
      '  float a = smoothstep(n - soft, n, e);\n' +
      '  float bd = min(min(px.x - rect.x, rect.x + rect.z - px.x), min(px.y - rect.y, rect.y + rect.w - px.y));\n' +
      '  float edge = a * (1. - a) * 4. * tintAmt * smoothstep(0., max(pad, 1.), bd);\n' +
      '  float al = max(a, edge);\n' +
      '  gl_FragColor = vec4(mix(vec3(14./255.), tint, edge) * al, al);\n' +
      '}'));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    var ql = gl.getAttribLocation(prog, 'q');
    gl.enableVertexAttribArray(ql); gl.vertexAttribPointer(ql, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied
    U = {};
    ['quad', 'warpK', 'lineAmt', 'lineW', 'lineH', 'wc', 'wh', 'scanAmt', 'scanGap', 'rollAmt', 'barY', 'barH',
      'snowAmt', 'mode', 'vAmt', 'vX', 'vWidth', 'vJag', 'vTime', 'vCol', 'rect', 'res', 'pad', 'p', 'seed',
      'grainScale', 'grainMix', 'coarse', 'soft', 'sweep', 'tintAmt', 'dir', 'tint',
      'touchPos', 'touchR', 'touchAmt', 'touchBloomA', 'touchRingA', 'touchStaticA', 'touchTime'
    ].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    tex = gl.createTexture();
    return true;
  }
  function setFilter() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    var f = S.smooth ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  }
  function loadGrainTexture() {
    return new Promise(function (resolve) {
      gim = new Image();
      gim.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, gim);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        setFilter();
        resolve();
      };
      gim.onerror = function () { resolve(); }; // never block init on a bad texture
      gim.src = GOLD200;
    });
  }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  // ---------------------------------------------------------------------------------------
  // barrel warp — identical maths to tuner.html's warpFwd / quadMatrix / warpTransform / setRect
  // ---------------------------------------------------------------------------------------
  // NAV_WARP: the path line / nav ([data-nav]) keeps its own warp, like its own crtNav level,
  // so it bends the same on every page — "read" pages leave their body text flat (WARP 0).
  var WARP = 0, NAV_WARP = 0, WC = [0, 0], WH = [1, 1];
  function unitWarp(u) { return u.nav ? NAV_WARP : WARP; }
  function warpFwd(x, y, k) {
    if (k == null) k = WARP;
    var sx = x, sy = y;
    for (var i = 0; i < 5; i++) {
      var nx = (sx - WC[0]) / WH[0], ny = (sy - WC[1]) / WH[1], r2 = nx * nx + ny * ny;
      sx = x - WH[0] * k * nx * r2; sy = y - WH[1] * k * ny * r2;
    }
    return [sx, sy];
  }
  function quadMatrix(w, h, P) {
    var x0 = P[0][0], y0 = P[0][1], x1 = P[1][0], y1 = P[1][1], x2 = P[2][0], y2 = P[2][1], x3 = P[3][0], y3 = P[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    var g = 0, hh = 0;
    if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
      var det = dx1 * dy2 - dx2 * dy1;
      g = (dx3 * dy2 - dx2 * dy3) / det; hh = (dx1 * dy3 - dx3 * dy1) / det;
    }
    var a = (x1 - x0 + g * x1) / w, b = (x3 - x0 + hh * x3) / h, d = (y1 - y0 + g * y1) / w, e = (y3 - y0 + hh * y3) / h;
    return 'matrix3d(' + a + ',' + d + ',0,' + (g / w) + ',' + b + ',' + e + ',0,' + (hh / h) + ',0,0,1,0,' + x0 + ',' + y0 + ',0,1)';
  }
  function warpTransform(u, tx, ty, sc) {
    var r = u.box || u.rect, cx = r.left + r.width / 2, cy = r.top + r.height / 2, k = unitWarp(u);
    var corners = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]];
    var P = corners.map(function (xy) {
      var x = xy[0], y = xy[1];
      var w = warpFwd(cx + (x - cx) * sc + tx, cy + (y - cy) * sc + ty, k);
      return [w[0] - r.left, w[1] - r.top];
    });
    return quadMatrix(r.width || 1, r.height || 1, P);
  }
  function setRect(x, y, w, h, k) {
    if (k == null) k = WARP;
    gl.uniform4f(U.rect, x, y, w, h);
    if (k > 0) {
      var c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]]
        .map(function (p) { return warpFwd(p[0], p[1], k); });
      var xs = c.map(function (p) { return p[0]; }), ys = c.map(function (p) { return p[1]; }), m = 3;
      var l = Math.min.apply(null, xs) - m, t = Math.min.apply(null, ys) - m;
      gl.uniform4f(U.quad, l, t, Math.max.apply(null, xs) + m - l, Math.max.apply(null, ys) + m - t);
    } else gl.uniform4f(U.quad, x, y, w, h);
  }

  // ---------------------------------------------------------------------------------------
  // phosphor fill / glow ink — identical to tuner.html's phosphorFill / phosphorAvg
  // ---------------------------------------------------------------------------------------
  var fillCache = new Map();
  function phosphorFill(c, m) {
    var key = c + '|' + m.toFixed(2) + S.crtMaskType;
    if (fillCache.has(key)) return fillCache.get(key);
    var nums = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    var r = nums[0] || 0, g = nums[1] || 0, b = nums[2] || 0, a = nums[3] === undefined ? 1 : nums[3];
    var k = 1 - 0.65 * m;
    function col(R, G, B) { return 'rgba(' + (R | 0) + ',' + (G | 0) + ',' + (B | 0) + ',' + a + ')'; }
    var f = 'repeating-linear-gradient(90deg, ' + col(r, g * k, b * k) + ' 0 1px, ' + col(r * k, g, b * k) + ' 1px 2px, ' + col(r * k, g * k, b) + ' 2px 3px)';
    if (S.crtMaskType === 'slot mask') f = 'repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,' + (0.5 * m) + ') 2px 3px), ' + f;
    fillCache.set(key, f); return f;
  }
  function phosphorAvg(c, m) {
    var nums = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    var r = nums[0] || 0, g = nums[1] || 0, b = nums[2] || 0, a = nums[3] === undefined ? 1 : nums[3];
    var f = (1 + 2 * (1 - 0.65 * m)) / 3;
    return 'rgba(' + (r * f | 0) + ',' + (g * f | 0) + ',' + (b * f | 0) + ',' + a + ')';
  }

  // ---------------------------------------------------------------------------------------
  // units — splitText / collectUnits / measureUnit / assignRandomFor / local()
  // ---------------------------------------------------------------------------------------
  // task 1: never split inside these — a <kbd> key, form controls, or an <svg> icon. Splitting
  // wraps each word in a .u span with its own padding/negative-margin box (see the CSS below);
  // on a <kbd> that offsets the glyph from the key's own border, which is what broke the
  // "i exif 2–6 columns ← → in viewer" hint. Checked by tagName, so it holds even for markup
  // fx.js has never seen (data-nosplit on the wrapping element is the other, markup-side fix).
  var NOSPLIT_TAGS = { KBD: 1, INPUT: 1, BUTTON: 1, SELECT: 1, TEXTAREA: 1, SVG: 1 };
  function splitText(el) {
    (function walk(node) {
      var kids = [].slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var n = kids[i];
        if (n.nodeType === 1) { if (!NOSPLIT_TAGS[n.tagName]) walk(n); continue; }
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        var frag = document.createDocumentFragment();
        var parts = n.textContent.split(/(\s+)/);
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j]; if (!p) continue;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); continue; }
          var s = document.createElement('span'); s.className = 'u'; s.textContent = p; s.dataset.text = p;
          frag.appendChild(s);
        }
        n.replaceWith(frag);
      }
    })(el);
  }

  var SEG_COUNT = 28;
  function ensureSplit(pageEl) {
    if (LITE) return;
    var ts = pageEl.querySelectorAll('[data-t]');
    for (var i = 0; i < ts.length; i++) {
      var el = ts[i];
      if (el.hasAttribute('data-fx-split')) continue;
      if (!el.hasAttribute('data-nosplit')) splitText(el);
      el.setAttribute('data-fx-split', '');
    }
    var rules = pageEl.querySelectorAll('[data-rule]');
    for (var k = 0; k < rules.length; k++) {
      var r = rules[k];
      if (r.hasAttribute('data-fx-ruled')) continue;
      r.style.display = 'flex';
      var html = '';
      for (var s = 0; s < SEG_COUNT; s++) html += '<i class="fx-rseg" data-s></i>';
      r.innerHTML = html;
      r.setAttribute('data-fx-ruled', '');
    }
  }

  function collectUnits(pageEl, viewportOnly) {
    var sel = '.u, [data-i], [data-s], [data-nosplit]';
    // [data-fx-ghost]: the idle-glitch band clones — never units of their own
    var list = [].slice.call(pageEl.querySelectorAll(sel)).filter(function (el) { return !el.closest('[data-fx-ghost]'); });
    if (viewportOnly) {
      list = list.filter(function (el) {
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.bottom > -innerHeight * 0.2 && r.top < innerHeight * 1.2;
      });
    }
    return list.map(function (el) {
      var kind = el.hasAttribute('data-i') ? 'img' : el.hasAttribute('data-s') ? 'rule' : 'text';
      var roleEl = el.closest ? el.closest('[data-role]') : null;
      var role = kind === 'img' ? 'img' : kind === 'rule' ? 'structure' : (roleEl ? roleEl.dataset.role : 'body') || 'body';
      var nav = !!(el.closest && el.closest('[data-nav]'));
      return { el: el, kind: kind, role: role, nav: nav };
    });
  }

  // images currently owned by an in-flight FX.develop() condense-in (opacity forced to 0 by
  // develop(), tracked in developingImgs below) must not also be driven by apply()/drawUnit
  // from a page transition or the resting-state pass — that would double-draw grain on the
  // same img and the resting pass would snap its opacity back early, popping the still-
  // dissolving photo. developingImgs is declared below; referenced here only once a transition
  // or resting pass actually runs, by which time the whole module has already initialised it.
  function excludeDeveloping(list) {
    return list.filter(function (u) { return !(u.kind === 'img' && developingImgs.has(u.el)); });
  }

  // the recurring "what to animate on this page" query: in-viewport units, minus anything an
  // in-flight develop() condense-in already owns (see excludeDeveloping above).
  function liveUnits(pageEl) {
    return excludeDeveloping(collectUnits(pageEl, true));
  }

  function resetStyleForUnit(el) {
    el.style.transform = ''; el.style.transformOrigin = ''; el.style.filter = ''; el.style.opacity = '';
    el.style.color = ''; el.style.textShadow = ''; el.classList.remove('ph'); el.style.removeProperty('--ph');
  }

  // rect only — safe to call every scroll frame (see updateUnitTransform below). Pulled out of
  // measureUnit() because re-reading ink colour (measureUnit's other half) is NOT safe to repeat
  // once a unit has been phosphor-filled: see the comment on updateUnitTransform.
  function measureRect(u) {
    var bx = u.el.getBoundingClientRect(); u.box = bx;
    if (u.el.classList.contains('u')) {
      var cs = getComputedStyle(u.el), pt = parseFloat(cs.paddingTop), pl = parseFloat(cs.paddingLeft);
      u.rect = new DOMRect(bx.left + pl, bx.top + pt, bx.width - 2 * pl, bx.height - 2 * pt);
    } else u.rect = bx;
  }

  // Ink is read once and baked into the phosphor fill, so it must never be a :hover colour —
  // a pointer resting on a link at measure time used to leave it stuck (e.g. a sage ledger
  // name). html.fx-measuring is held for the current task only (cleared in a microtask, before
  // any paint); site.css scopes its hover colours to html:not(.fx-measuring).
  var measuring = false;
  function measuringOn() {
    if (measuring) return;
    measuring = true; document.documentElement.classList.add('fx-measuring');
    Promise.resolve().then(function () { document.documentElement.classList.remove('fx-measuring'); measuring = false; });
  }
  function measureUnit(u) {
    measureRect(u);
    if (u.kind === 'text') {
      measuringOn();
      var nodes = [u.el].concat([].slice.call(u.el.querySelectorAll('*')));
      u.inks = nodes.map(function (n) { return [n, getComputedStyle(n).color]; });
      // task 4: phosphor stripes/glow at a 3px pitch shred small text. Scale their strength by
      // font size, read once here (not per frame) — a 13-14px UI line comes out ~0.3-0.4,
      // the big home name ~1. Chroma/VHS during transitions is untouched (apply() never
      // multiplies cp by this).
      var fpx = parseFloat(getComputedStyle(u.el).fontSize) || 15;
      u.sizeK = clamp((fpx - 11) / (28 - 11), 0.3, 1);
    }
  }

  var RANK = { structure: 0, head: 1, body: 2, img: 3 };
  function orderKey(u, i, list, rank) {
    var W = innerWidth, H = innerHeight;
    switch (S.order) {
      case 'reading': return i / Math.max(1, list.length - 1);
      case 'random': return u.r1;
      case 'top → bottom': return u.rect.top / H;
      case 'left → right': return u.rect.left / W;
      case 'bottom → top': return 1 - u.rect.bottom / H;
      default: return (rank + u.r2 * 0.9) / 4; // 'structure → text → images'
    }
  }
  function assignRandomFor(list, seed, mirror) {
    var R = rng(seed);
    list.forEach(function (u, i) {
      u.r1 = R(); u.r2 = R(); u.g = R() * 97;
      var rank = RANK[u.role]; if (rank === undefined) rank = 2;
      if (mirror) rank = 3 - rank;
      var key = orderKey(u, i, list, rank);
      u.delay = clamp(key + (u.r1 - key) * S.orderRand, 0, 1);
      u.sizeF = 1 + (Math.min(1.5, Math.max(0.35, u.rect.height / 60)) - 1) * S.sizeSpeed;
    });
  }
  function local(u, t, P) {
    // task 12: the clicked element stays fully present through the rest of the out-phase,
    // then dissolves in the last 30% of it, finishing exactly at P (outMs) — "the thing you
    // click dematerialises last", like a phosphor holding the image a beat longer.
    if (u._lateOut) {
      var start2 = P * 0.7, len2 = Math.max(1, P * 0.3);
      return clamp((t - start2) / len2, 0, 1);
    }
    var len = P * (1 - S.spread) * (1 + S.jitter * (u.r2 * 2 - 1)) * u.sizeF;
    var start = P * S.spread * u.delay;
    return clamp((t - start) / Math.max(1, len), 0, 1);
  }

  // ---------------------------------------------------------------------------------------
  // apply() — identical maths to tuner.html's apply(u, p, blurMax), parameterised on a per-call
  // context instead of module globals (CU / NAVLV / VHS in the tuner).
  // ctx = { navLevel, crtLevel, vEnv, vT, barY, cu }
  // ---------------------------------------------------------------------------------------
  function vhsAt(y, ctx) {
    var d = (y - ctx.barY) / Math.max(1, S.rollH);
    return Math.exp(-d * d * 4) * (S.roll > 0 ? 1 : 0);
  }
  function apply(u, p, blurMax, ctx) {
    var crtU = u.nav ? ctx.navLevel : (ctx.crtLevel || 0);
    var mult = u.kind === 'img' ? S.imgBlur : S.textBlur;
    var cu = ctx.cu;
    var b = cu ? cu.blur : p * blurMax * mult;
    if (u.kind === 'text') {
      var sizeK = u.sizeK == null ? 1 : u.sizeK; // task 4
      var on = b > 0.05;
      var near = vhsAt(u.rect.top + u.rect.height / 2, ctx);
      var cp = cu ? cu.cp : S.chroma * ctx.vEnv * (0.6 + 0.4 * near + 0.8 * near);
      var pair = PAIRS[S.chromaPair], c1 = pair[0], c2 = pair[1];
      for (var i = 0; i < u.inks.length; i++) {
        var n = u.inks[i][0], c = u.inks[i][1];
        var shArr = [], m = S.crtMask * crtU * sizeK, ink = phosphorAvg(c, m > 0.02 ? m : 0);
        if (on) shArr.push('0 0 ' + (b * 2) + 'px ' + ink);
        if (cp > 0.05) {
          shArr.push((-cp) + 'px 0 ' + (on ? b * 2 : 0) + 'px rgba(' + c1 + ',.7)');
          shArr.push(cp + 'px 0 ' + (on ? b * 2 : 0) + 'px rgba(' + c2 + ',.7)');
        }
        // task 12: the clicked element's units hold a slightly stronger glow just before they
        // dissolve, like a phosphor holding the image.
        var glowBoost = u._lateOut ? 1.35 : 1;
        var gm = cu ? cu.glow : 1, ga = Math.min(1, 0.45 * S.crtGlow * crtU * gm * sizeK * glowBoost);
        if (S.crtGlow > 0 && crtU > 0) {
          shArr.push('0 0 ' + ((3 + S.crtGlow * 9) * (0.6 + 0.4 * gm) * sizeK * glowBoost) + 'px ' + ink.replace(/,[\d.]+\)$/, ',' + ga + ')'));
        }
        var fill = !on && m > 0.02 && n.classList.contains('u');
        if (fill) n.style.setProperty('--ph', phosphorFill(c, m));
        n.classList.toggle('ph', fill);
        n.style.color = on ? 'transparent' : '';
        n.style.textShadow = shArr.join(', ');
      }
      u.el.style.filter = '';
    } else {
      u.el.style.filter = b > 0.01 ? 'blur(' + b + 'px)' : '';
    }
    var t0 = 1 - S.tail, tailK = p <= t0 ? 1 : 1 - (p - t0) / Math.max(0.001, S.tail);
    var op = Math.min(1 - p * S.fade, tailK);
    u.el.style.opacity = cu ? (cu.op < 1 ? cu.op : '') : (p >= 0.995 ? 0 : (op < 1 ? op : ''));
    var ty = p * S.drift, sc = 1 + (S.scale - 1) * p, tx = 0;
    if (S.tear > 0 && ctx.vEnv > 0) {
      var band = Math.floor((u.rect.top + u.rect.height / 2) / 6), fr = Math.floor(ctx.vT * 24);
      var j = (Math.sin(band * 12.9898 + fr * 78.233) * 43758.5453) % 1;
      tx = S.tear * ctx.vEnv * (vhsAt(u.rect.top + u.rect.height / 2, ctx) * (0.6 + 0.4 * j) + 0.08 * j);
    }
    u.tx = tx;
    if (unitWarp(u) > 0) { u.el.style.transformOrigin = '0 0'; u.el.style.transform = warpTransform(u, tx, ty, sc); }
    else { u.el.style.transformOrigin = ''; u.el.style.transform = (ty || tx || sc !== 1) ? ('translate(' + tx + 'px, ' + ty + 'px) scale(' + sc + ')') : ''; }
    return b;
  }

  function drawUnit(u, p, blurMax, ctx) {
    var b = apply(u, p, blurMax, ctx);
    if (p <= 0.001) return;
    // photos never dissolve through grain unless photoReveal is 'grain': in a page transition
    // they just blur/fade out via apply(), and come back in through their own CSS reveal.
    if (u.kind === 'img' && REVEAL_MODE !== 'grain') return;
    var pad = b * S.halo + 1, r = u.rect, ty = p * S.drift;
    var vpad = pad + (u.kind === 'text' ? r.height * 0.15 : 0);
    gl.uniform1f(U.pad, pad);
    // the grain bends with the word: nav words may warp more than the page (see NAV_WARP)
    var k = unitWarp(u);
    if (k !== WARP) gl.uniform1f(U.warpK, k);
    setRect(r.left - pad + (u.tx || 0), r.top - vpad + ty, r.width + pad * 2, r.height + vpad * 2, k);
    gl.uniform1f(U.coarse, S.patchRel ? Math.max(6, Math.min(S.coarse, r.height * 1.4)) : S.coarse);
    gl.uniform1f(U.p, p); gl.uniform1f(U.seed, u.g);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (k !== WARP) gl.uniform1f(U.warpK, WARP);
  }

  // ---------------------------------------------------------------------------------------
  // shared per-frame GL setup, shared scheduler (page transitions + photo grain effects all
  // run as tick(now)->bool entries so only one gl.clear()/uniform setup happens per frame).
  // ---------------------------------------------------------------------------------------
  function beginGLFrame() {
    var dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    var cw = (W * dpr) | 0, ch = (H * dpr) | 0;
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.grainScale, S.grainScale); gl.uniform1f(U.grainMix, S.grainMix);
    gl.uniform1f(U.coarse, S.coarse); gl.uniform1f(U.soft, S.soft); gl.uniform1f(U.sweep, S.sweep);
    var ang = S.sweepAngle * Math.PI / 180; gl.uniform2f(U.dir, Math.cos(ang), Math.sin(ang));
    gl.uniform3fv(U.tint, hexRgb(S.tint)); gl.uniform1f(U.tintAmt, S.tintAmt);
    return { W: W, H: H };
  }
  function setWarpUniforms(level, W, H, navLevel) {
    WARP = S.crtWarp * level; NAV_WARP = S.crtWarp * (navLevel == null ? navRestingLevel() : navLevel); WC = [W / 2, H / 2]; WH = [W / 2, H / 2];
    gl.uniform1f(U.warpK, WARP); gl.uniform2f(U.wc, WC[0], WC[1]); gl.uniform2f(U.wh, WH[0], WH[1]);
  }
  function vhsEnvelope(elapsed, outMs, holdMs, inMs) {
    var tot = outMs + holdMs + inMs, k = elapsed / tot, tIn = elapsed - outMs - holdMs;
    switch (S.vcrPeak) {
      case 'out only': return elapsed < outMs ? Math.sin(Math.PI * elapsed / outMs) : 0;
      case 'in only': return tIn > 0 ? Math.sin(Math.PI * Math.min(1, tIn / inMs)) : 0;
      case 'whole time': return (k > 0 && k < 1) ? 1 : 0;
      default: return Math.sin(Math.PI * clamp(k, 0, 1)); // 'mid-transition'
    }
  }
  function drawGlobalPasses(vEnv, vT, barY, W, H, pk, forceLine) {
    if (S.vcr > 0 && vEnv > 0.001) {
      var R = rng(((Math.random() * 1e6) | 0));
      gl.uniform1i(U.mode, 1);
      gl.uniform4f(U.rect, 0, 0, W, H);
      gl.uniform1f(U.vAmt, S.vcr * vEnv); gl.uniform1f(U.vX, W * (0.55 + R() * 0.42));
      gl.uniform1f(U.vWidth, S.vcrWidth); gl.uniform1f(U.vJag, S.vcrJag); gl.uniform1f(U.vTime, vT);
      gl.uniform3fv(U.vCol, hexRgb(S.vcrCol));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.uniform1i(U.mode, 0);
    }
    if ((S.scan > 0 || S.roll > 0) && vEnv > 0.001) {
      gl.uniform1i(U.mode, 2);
      setRect(0, 0, W, H);
      gl.uniform1f(U.scanAmt, S.scan * vEnv); gl.uniform1f(U.scanGap, S.scanGap);
      gl.uniform1f(U.rollAmt, S.roll * vEnv); gl.uniform1f(U.barY, barY); gl.uniform1f(U.barH, S.rollH);
      gl.uniform1f(U.snowAmt, S.snow); gl.uniform1f(U.vTime, vT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.uniform1i(U.mode, 0);
    }
    // the glowing line: always during the cold start, otherwise only with power off/on enabled.
    // It follows the collapsing picture (same sx/sy as powerScale), like the tuner.
    if ((S.crtPower || forceLine) && pk > 0.02) {
      gl.uniform1i(U.mode, 3); setRect(0, 0, W, H);
      var lsy = 1 - pk * pk * 0.996, lsx = pk > 0.75 ? 1 - Math.pow((pk - 0.75) / 0.25, 2) * 0.985 : 1;
      var flash = clamp((pk - 0.7) / 0.2, 0, 1);
      gl.uniform1f(U.lineAmt, flash); gl.uniform1f(U.lineW, W / 2 * lsx);
      gl.uniform1f(U.lineH, 1.5 + H * lsy * 0.06);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.uniform1i(U.mode, 0);
    }
  }
  function powerScale(el, pk) {
    if (pk <= 0) return;
    var sy = 1 - pk * pk * 0.996, sx = pk > 0.75 ? 1 - Math.pow((pk - 0.75) / 0.25, 2) * 0.985 : 1;
    el.style.transformOrigin = '50% 50%';
    el.style.transform = 'scale(' + sx + ',' + sy + ')';
  }

  var activeEffects = new Set();
  var rafId = null;
  function loopTick(now) {
    rafId = null;
    if (activeEffects.size === 0) return; // no idle rAF loop
    beginGLFrame();
    activeEffects.forEach(function (fx) {
      var alive;
      try { alive = fx.tick(now); } catch (e) { console.error('[fx]', e); alive = false; }
      if (!alive) activeEffects.delete(fx);
    });
    if (activeEffects.size > 0) ensureLoop();
  }
  function ensureLoop() { if (rafId == null) rafId = requestAnimationFrame(loopTick); }
  function addEffect(fx) { activeEffects.add(fx); ensureLoop(); }

  // test-only: the most recently started effect's tick fn + its t0, for FX._debugFreeze()
  var DEBUG_TICK = null, DEBUG_T0 = 0;

  // ---------------------------------------------------------------------------------------
  // task 11 — "finger on the screen": a soft bloom + hue-sweeping ring + sparse static at the
  // pointer, only while it's over an interactive element (shader mode 4, see createGL above).
  // The rAF loop this runs under costs nothing at rest: addEffect()/the tick's own `return
  // false` are the only entry/exit points, same as every other effect here.
  // ---------------------------------------------------------------------------------------
  var TOUCH_SEL = 'a[href], button, .tile, figure';
  var touchTarget = null, touchLeaving = false;
  var touchX = 0, touchY = 0, touchTX = 0, touchTY = 0, touchAmt = 0;
  var touchEnterT0 = 0, touchLeaveT0 = 0, touchPressT0 = 0;
  var touchEffect = null, touchHavePos = false;
  function touchAllowed() {
    if (LITE || !gl || !S.touch) return false;
    return !prefersReducedMotion();
  }
  function touchRadiusFor(el) {
    return (el && el.closest && el.closest('.tile, figure')) ? S.touchRadiusImg : S.touchRadius;
  }
  function ensureTouchEffect() {
    if (touchEffect) return;
    touchEffect = {
      tick: function (now) {
        touchX += (touchTX - touchX) * 0.35;
        touchY += (touchTY - touchY) * 0.35;
        var k;
        if (touchLeaving) { k = Math.min(1, (now - touchLeaveT0) / 250); touchAmt = 1 - k; }
        else { k = Math.min(1, (now - touchEnterT0) / 150); touchAmt = k; }
        var press = touchPressT0 ? Math.max(0, 1 - (now - touchPressT0) / 120) : 0;
        var level = currentPage ? pageRestingLevel(currentPage) : 1;
        var r = touchRadiusFor(touchTarget) * (1 + press * 0.12);
        gl.uniform1i(U.mode, 4);
        gl.uniform4f(U.quad, touchX - r * 2, touchY - r * 2, r * 4, r * 4);
        gl.uniform2f(U.touchPos, touchX, touchY);
        gl.uniform1f(U.touchR, r);
        gl.uniform1f(U.touchAmt, Math.max(0, Math.min(1, touchAmt)) * level);
        gl.uniform1f(U.touchBloomA, S.touchBloom * (1 + press * 0.6));
        gl.uniform1f(U.touchRingA, S.touchRing);
        gl.uniform1f(U.touchStaticA, S.touchStatic * (1 + press * 1.2));
        gl.uniform1f(U.touchTime, now / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.uniform1i(U.mode, 0);
        if (touchLeaving && k >= 1) { touchEffect = null; return false; }
        return true;
      }
    };
    addEffect(touchEffect);
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || !touchAllowed()) return;
    touchTX = e.clientX; touchTY = e.clientY;
    if (!touchHavePos) { touchX = touchTX; touchY = touchTY; touchHavePos = true; }
    var t = e.target && e.target.closest ? e.target.closest(TOUCH_SEL) : null;
    if (t === touchTarget) return;
    if (t) { touchTarget = t; touchLeaving = false; touchEnterT0 = performance.now(); ensureTouchEffect(); }
    else if (touchTarget) { touchTarget = null; touchLeaving = true; touchLeaveT0 = performance.now(); ensureTouchEffect(); }
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || !touchTarget) return;
    touchPressT0 = performance.now();
  }, true);

  // ---------------------------------------------------------------------------------------
  // task 13 — idle VHS jiggle on the home name. setTimeout schedules the next attempt (no rAF
  // between glitches); rAF only runs during an actual burst. data-fx-idle marks the target so
  // this is reusable on other elements later.
  // ---------------------------------------------------------------------------------------
  var idleTimer = null;
  function idleGlitchBlocked(el) {
    if (LITE || !S.idleGlitch || !el || !el.offsetParent) return true;
    if (prefersReducedMotion()) return true;
    if (document.visibilityState === 'hidden') return true;
    if (document.documentElement.classList.contains('fx-transitioning') || isOff) return true;
    try { if (el.matches(':hover')) return true; } catch (e) {}
    return false;
  }
  function scheduleIdleGlitch() {
    clearTimeout(idleTimer);
    if (LITE || !S.idleGlitch) return;
    var delay = S.idleMin + Math.random() * Math.max(0, S.idleMax - S.idleMin);
    idleTimer = setTimeout(runIdleGlitchAttempt, delay);
  }
  // VHS tracking wobble: the element is cut into horizontal bands (stacked clones, each clipped to
  // one band) and a displacement wave rolls top -> bottom through them, so letters bend into
  // jagged S-shapes like bad tracking, with a colour split where they shift most. The clones
  // are deep copies, so each word keeps its warp matrix3d / phosphor fill; the original is only
  // hidden (visibility), never restyled. Everything is torn down at the end — nothing at rest.
  var IDLE_BANDS = 18;
  function runIdleGlitchBurst(el) {
    if (!el.querySelector('.u')) return 0;
    var dur = 520 + Math.random() * 380;
    var t0 = performance.now();
    var amp = (9 + Math.random() * 7) * S.idleAmt;          // px at the wave's crest
    var dir = Math.random() < 0.5 ? 1 : -1;
    var freq = 9 + Math.random() * 6, phase = Math.random() * 6.283;
    var r = el.getBoundingClientRect();

    var ov = document.createElement('div');
    ov.setAttribute('data-fx-ghost', '');
    ov.setAttribute('aria-hidden', 'true');
    ov.style.cssText = 'position:absolute;pointer-events:none;margin:0;width:' + r.width + 'px;height:' + r.height + 'px;';
    el.parentNode.insertBefore(ov, el.nextSibling);
    var o = ov.getBoundingClientRect();
    ov.style.transform = 'translate(' + (r.left - o.left) + 'px,' + (r.top - o.top) + 'px)';

    var bands = [];
    for (var i = 0; i < IDLE_BANDS; i++) {
      var c = el.cloneNode(true);
      c.removeAttribute('data-fx-idle'); c.removeAttribute('data-t');
      c.style.cssText += ';position:absolute;left:0;top:0;margin:0;width:' + r.width + 'px;visibility:visible;';
      // first/last band reach far past the box so ascenders, accents and descenders survive
      var y0 = i === 0 ? -60 : (i / IDLE_BANDS) * 100, y1 = i === IDLE_BANDS - 1 ? 160 : ((i + 1) / IDLE_BANDS) * 100;
      c.style.clipPath = 'polygon(-20% ' + y0 + '%, 120% ' + y0 + '%, 120% ' + y1 + '%, -20% ' + y1 + '%)';
      var words = [].slice.call(c.querySelectorAll('.u'));
      bands.push({ el: c, y: (i + 0.5) / IDLE_BANDS, words: words, sh: words.map(function (w) { return w.style.textShadow; }) });
      ov.appendChild(c);
    }
    el.style.visibility = 'hidden';

    function done() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      el.style.visibility = '';
    }
    addEffect({
      tick: function (now) {
        var k = (now - t0) / dur;
        if (k >= 1 || document.documentElement.classList.contains('fx-transitioning') || isOff) { done(); return false; }
        var env = Math.sin(Math.PI * clamp(k, 0, 1));
        var crest = -0.35 + 1.7 * k;                          // the wave rolls top -> bottom
        var fr = Math.floor(now / 33);                        // ~30 fps tape jitter
        for (var i = 0; i < bands.length; i++) {
          var b = bands[i], dy = (b.y - crest) / 0.32;
          var w = Math.exp(-dy * dy);
          var jit = (Math.sin(i * 12.9898 + fr * 78.233) * 43758.5453) % 1;
          var x = dir * amp * env * (w * Math.sin(b.y * freq + phase + k * 7) + 0.18 * jit * w);
          b.el.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
          var cs = Math.min(3, Math.abs(x) * 0.35);
          var ghost = cs > 0.2 ? (-cs).toFixed(2) + 'px 0 rgba(255,40,60,.55), ' + cs.toFixed(2) + 'px 0 rgba(0,220,255,.55)' : '';
          for (var j = 0; j < b.words.length; j++) {
            var base = b.sh[j];
            b.words[j].style.textShadow = ghost ? (base ? base + ', ' + ghost : ghost) : base;
          }
        }
        return true;
      }
    });
    return dur;
  }
  // one burst right now (no hover check — it's a one-off, not idle), then the idle timer restarts
  // so the next random wobble can't land straight after it
  function idleGlitchNow(el) {
    if (!el || LITE || !S.idleGlitch || !el.offsetParent || isOff) return;
    if (prefersReducedMotion()) return;
    if (document.documentElement.classList.contains('fx-transitioning')) return;
    runIdleGlitchBurst(el);
    scheduleIdleGlitch();
  }
  function runIdleGlitchAttempt() {
    var el = document.querySelector('[data-fx-idle]');
    if (idleGlitchBlocked(el)) { scheduleIdleGlitch(); return; }
    var dur = runIdleGlitchBurst(el);
    // double jolt starts after the first ends, so its saved base is the true resting state
    if (dur && Math.random() < 0.25) setTimeout(function () { if (!idleGlitchBlocked(el)) runIdleGlitchBurst(el); }, dur + 80);
    scheduleIdleGlitch();
  }

  // ---------------------------------------------------------------------------------------
  // resting CRT state — applied once per page shown (show / coldStart end / transition end),
  // never per frame. Point 4/5 of the spec.
  // ---------------------------------------------------------------------------------------
  var currentPage = null;
  var scrollCleanup = null;

  // task 12: remember what was clicked/activated right before a navigation, so the out-phase
  // can make that element dematerialise last. Captured on pointerdown/click (capture phase, so
  // it is set before the site's own click handler runs the hash change) and on Enter for
  // keyboard activation. Consumed (cleared) the moment an out-phase actually reads it.
  var lastActivated = null;
  function closestActivatable(el) {
    return el && el.closest ? el.closest('a[href], button, [data-i]') : null;
  }
  document.addEventListener('pointerdown', function (e) {
    var t = closestActivatable(e.target);
    if (t) lastActivated = t;
  }, true);
  document.addEventListener('click', function (e) {
    var t = closestActivatable(e.target);
    if (t) lastActivated = t;
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = closestActivatable(document.activeElement);
    if (t) lastActivated = t;
  }, true);

  function crtLevelFor(pageEl) {
    var kind = pageEl.dataset.crt;
    if (kind === 'read') return S.crtRead;
    return 1; // full | photos
  }
  function pageRestingLevel(pageEl) {
    if (S.crt === 'off' || S.crt === 'transition only') return 0;
    return crtLevelFor(pageEl);
  }
  function navRestingLevel() { return S.crt === 'always' ? S.crtNav : 0; }

  function applyPhotosZ(pageEl) {
    if (pageEl.dataset.crt !== 'photos') return;
    // [data-i] is still the <img> itself (data-i didn't move to .frame) — querySelectorAll
    // finds it at any depth, so the .frame wrapper doesn't change what this targets. .frame
    // has z-index:auto, so lifting just the img above the CRT glass (z:6) is enough; .frame's
    // own ::before (the reveal-stage visuals) stays under it, same stacking context.
    var imgs = pageEl.querySelectorAll('[data-i]');
    for (var i = 0; i < imgs.length; i++) { imgs[i].style.position = 'relative'; imgs[i].style.zIndex = '7'; }
  }

  function restingCtx(pageEl) {
    var level = pageRestingLevel(pageEl);
    return { navLevel: navRestingLevel(), crtLevel: level, vEnv: 0, vT: 0, barY: -99999, cu: null };
  }

  // scroll-driven warp update — bug: the sticky path line and the (non-sticky) collection/exif
  // row would lose their text while scrolling the photographs page and never get it back.
  // Cause: this handler used to call the FULL apply(u, 0, 0, ctx) on every scroll frame, which
  // re-reads each node's ink colour via measureUnit() -> getComputedStyle(n).color. But once a
  // unit has been phosphor-filled at rest, its real colour is forced transparent by the .ph
  // class (`!important`) — so the NEXT re-measure reads back "transparent" as if it were the
  // true ink, bakes that into phosphorAvg/phosphorFill, and the word degrades to an invisible
  // (black/alpha-0) fill. Every further scroll-frame re-measure repeats the same read, so it
  // never recovers on its own — only a full applyRestingState() (which resets style before
  // measuring) fixes it, which is why it looked "stuck" until the next navigation.
  // Fix: scroll only ever needs to re-warp position (the barrel distortion depends on where the
  // unit sits on screen). It must never re-derive ink/glow/fill — that is resting-state's job,
  // done once by applyRestingState (reset style -> measure -> apply), which IS idempotent since
  // every property apply() touches is always fully overwritten, never partially patched.
  function updateUnitTransform(u) {
    if (unitWarp(u) > 0) { u.el.style.transformOrigin = '0 0'; u.el.style.transform = warpTransform(u, 0, 0, 1); }
    else if (u.el.style.transform) { u.el.style.transformOrigin = ''; u.el.style.transform = ''; }
  }

  function setupWarpScrollListener(pageEl, warpOK) {
    if (scrollCleanup) { scrollCleanup(); scrollCleanup = null; }
    if (!warpOK) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        // sticky elements (the path line) move with the viewport, not the document: re-reading
        // getBoundingClientRect() live, right here, is what keeps them correct — it already
        // reports their current on-screen box, stuck or not.
        // only warped units need re-warping: on "read" pages that's just the path line, so a long
        // project write-up doesn't re-measure every word per scroll frame.
        var units = liveUnits(pageEl).filter(function (u) { return unitWarp(u) > 0; });
        units.forEach(function (u) { measureRect(u); updateUnitTransform(u); });
      });
    }
    addEventListener('scroll', onScroll, { passive: true });
    scrollCleanup = function () { removeEventListener('scroll', onScroll); };
  }

  function applyRestingState(pageEl) {
    if (LITE) { currentPage = pageEl; return; }
    ensureSplit(pageEl);
    var level = pageRestingLevel(pageEl);
    var warpOK = pageEl.dataset.crt !== 'read' && (S.crtWarp * level) >= 0.004;
    var navWarpOK = (S.crtWarp * navRestingLevel()) >= 0.004;
    WARP = warpOK ? S.crtWarp * level : 0;
    NAV_WARP = navWarpOK ? S.crtWarp * navRestingLevel() : 0;
    WC = [innerWidth / 2, innerHeight / 2]; WH = [innerWidth / 2, innerHeight / 2];
    var ctx = restingCtx(pageEl);
    var units = liveUnits(pageEl);
    units.forEach(function (u) { resetStyleForUnit(u.el); measureUnit(u); apply(u, 0, 0, ctx); });
    applyPhotosZ(pageEl);
    setGlassLevel(level);
    setupWarpScrollListener(pageEl, warpOK || navWarpOK);
    currentPage = pageEl;
  }

  var remeasureT = null;
  function scheduleRemeasure() {
    if (LITE || !currentPage) return;
    clearTimeout(remeasureT);
    remeasureT = setTimeout(function () { if (currentPage) applyRestingState(currentPage); }, 60);
  }

  // ---------------------------------------------------------------------------------------
  // transition() — out phase on fromEl, swap(), in phase on toEl. Busy = latest-wins queue.
  // ---------------------------------------------------------------------------------------
  function runOneFull(fromEl, toEl, swap) {
    return new Promise(function (resolve, reject) {
      ensureSplit(fromEl);
      var baseSeed = (Math.random() * 1e6) | 0;
      var outUnits = liveUnits(fromEl);
      outUnits.forEach(function (u) { resetStyleForUnit(u.el); measureUnit(u); });
      assignRandomFor(outUnits, baseSeed * 7919, S.mirrorOut);

      // task 12: if this navigation came from clicking/activating something on fromEl, mark
      // its units so local() holds them until late in the out-phase (see local()'s _lateOut
      // branch). Anything else (back button, typed hash) uses the normal order.
      var clicked = lastActivated; lastActivated = null;
      if (clicked && fromEl.contains(clicked)) {
        outUnits.forEach(function (u) { if (clicked === u.el || clicked.contains(u.el)) u._lateOut = true; });
      }

      var fromCrt = pageRestingLevel(fromEl), toCrt = pageRestingLevel(toEl);
      var navLv = navRestingLevel();
      var tot = S.outMs + S.holdMs + S.inMs;

      var state = 'out', t0 = performance.now(), holdT0 = 0, inT0 = 0, inUnits = null;
      DEBUG_TICK = tick; DEBUG_T0 = t0;

      function elapsedTotal(now) {
        if (state === 'out') return now - t0;
        if (state === 'hold') return S.outMs + (now - holdT0);
        if (state === 'swapping') return S.outMs + S.holdMs;
        return S.outMs + S.holdMs + (now - inT0);
      }

      function tick(now) {
        var W = innerWidth, H = innerHeight;
        var elapsed = elapsedTotal(now);
        var kk = clamp(elapsed / tot, 0, 1), mixAB = kk * kk * (3 - 2 * kk);
        var sceneLv = fromCrt + (toCrt - fromCrt) * mixAB;
        var vEnv = vhsEnvelope(elapsed, S.outMs, S.holdMs, S.inMs);
        var crtLevel = S.crt === 'always' ? sceneLv : (S.crt === 'transition only' ? vEnv : 0);
        var navLevel = S.crt === 'always' ? navLv : (S.crt === 'transition only' ? vEnv * S.crtNav : 0);
        setWarpUniforms(crtLevel, W, H, navLevel);
        setGlassLevel(crtLevel);
        var vT = elapsed / 1000;
        var barY = (vT * S.rollSpeed) % (H + S.rollH * 2) - S.rollH;
        var ctx = { navLevel: navLevel, crtLevel: crtLevel, vEnv: vEnv, vT: vT, barY: barY, cu: null };

        if (state === 'out') {
          var t = now - t0;
          var pk = S.crtPower ? clamp((t / S.outMs - 0.45) / 0.55, 0, 1) : 0;
          powerScale(fromEl, pk);
          for (var i = 0; i < outUnits.length; i++) {
            var u = outUnits[i];
            var p = ease(S.outEase, local(u, t, S.outMs));
            drawUnit(u, p, S.blurOut, ctx);
          }
          drawGlobalPasses(vEnv, vT, barY, W, H, pk);
          if (t >= S.outMs) {
            for (var j = 0; j < outUnits.length; j++) outUnits[j].el.style.opacity = '0';
            fromEl.style.transform = '';
            if (S.holdMs > 0) { state = 'hold'; holdT0 = now; DEBUG_T0 = now; }
            else beginSwap(now);
          }
        } else if (state === 'hold') {
          drawGlobalPasses(vEnv, vT, barY, W, H, 0);
          if (now - holdT0 >= S.holdMs) beginSwap(now);
        } else if (state === 'swapping') {
          // nothing visible to draw: fromEl fully hidden, toEl not measured yet
        } else if (state === 'in') {
          var t2 = now - inT0;
          var pk2 = S.crtPower ? 1 - clamp(t2 / (S.inMs * 0.45), 0, 1) : 0;
          powerScale(toEl, pk2);
          for (var k2 = 0; k2 < inUnits.length; k2++) {
            var u2 = inUnits[k2];
            var p2 = 1 - ease(S.inEase, local(u2, t2, S.inMs));
            drawUnit(u2, p2, S.blurIn, ctx);
          }
          drawGlobalPasses(vEnv, vT, barY, W, H, pk2);
          if (t2 >= S.inMs) {
            toEl.style.transform = '';
            finalize();
            resolve();
            return false;
          }
        }
        return true;
      }

      function beginSwap(now) {
        state = 'swapping';
        // task 9: toEl is still `hidden` here; swap() is about to clear that attribute, and it
        // awaits real async work (e.g. the photographs masonry fetch) before our .then() below
        // runs — plenty of time for the browser to paint toEl plain (no phosphor/glow, full
        // brightness) before FX ever touches it. Hold it invisible — inline style, so it
        // survives the `hidden` attribute toggle — until it's fully FX-ready.
        toEl.style.visibility = 'hidden';
        Promise.resolve().then(function () { return swap(); }).then(function () {
          ensureSplit(toEl);
          inUnits = liveUnits(toEl);
          inUnits.forEach(function (u) { resetStyleForUnit(u.el); measureUnit(u); });
          assignRandomFor(inUnits, baseSeed * 7919 + 5000, false);
          // paint toEl's incoming look — fully dissolved (p=1), its CRT level set — right now,
          // synchronously, before it is ever visible: exactly the frame the first real 'in'
          // tick below would draw (t2=0 -> p2=1), just drawn ahead of time so there is no gap
          // where the browser could composite toEl plain.
          var W = innerWidth, H = innerHeight;
          setWarpUniforms(toCrt, W, H);
          setGlassLevel(toCrt);
          var preCtx = { navLevel: navLv, crtLevel: toCrt, vEnv: 0, vT: 0, barY: -99999, cu: null };
          beginGLFrame();
          inUnits.forEach(function (u) { drawUnit(u, 1, S.blurIn, preCtx); });
          toEl.style.visibility = '';
          state = 'in'; inT0 = performance.now(); DEBUG_T0 = inT0;
        }).catch(function (err) { activeEffects.delete(effect); reject(err); });
      }

      function finalize() {
        outUnits.forEach(function (u) { resetStyleForUnit(u.el); });
        if (inUnits) inUnits.forEach(function (u) { resetStyleForUnit(u.el); });
        applyRestingState(toEl);
      }

      var effect = { tick: tick };
      addEffect(effect);
    });
  }

  function tween(el, fromOp, toOp, ms) {
    return new Promise(function (res) {
      var t0 = performance.now();
      function step(now) {
        var k = Math.min(1, (now - t0) / ms);
        el.style.opacity = String(fromOp + (toOp - fromOp) * k);
        if (k < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  }
  function runOneLite(fromEl, toEl, swap) {
    return tween(fromEl, 1, 0, 150)
      .then(function () { return swap(); })
      .then(function () {
        toEl.style.opacity = '0';
        return tween(toEl, 0, 1, 150);
      })
      .then(function () { toEl.style.opacity = ''; fromEl.style.opacity = ''; currentPage = toEl; });
  }

  // task 2/10/11: disable the hover word-glow/underline/photo-glow/touch-bloom while a
  // transition is running — a class on <html>, checked by the CSS those features inject.
  function runOne(fromEl, toEl, swap) {
    document.documentElement.classList.add('fx-transitioning');
    var p = LITE ? runOneLite(fromEl, toEl, swap) : runOneFull(fromEl, toEl, swap);
    return p.then(function (v) { document.documentElement.classList.remove('fx-transitioning'); return v; },
      function (e) { document.documentElement.classList.remove('fx-transitioning'); throw e; });
  }

  var busy = false, pendingReq = null, pendingWaiters = [];
  function transition(fromEl, toEl, swap) {
    return new Promise(function (resolve, reject) {
      if (busy) { pendingReq = { fromEl: fromEl, toEl: toEl, swap: swap }; pendingWaiters.push({ resolve: resolve, reject: reject }); return; }
      busy = true;
      runOne(fromEl, toEl, swap).then(resolve, reject).then(drainQueue, drainQueue);
    });
  }
  function drainQueue() {
    if (!pendingReq) { busy = false; return; }
    var req = pendingReq; pendingReq = null;
    var waiters = pendingWaiters; pendingWaiters = [];
    runOne(req.fromEl, req.toEl, req.swap).then(function () {
      waiters.forEach(function (w) { w.resolve(); });
      drainQueue();
    }, function (e) {
      waiters.forEach(function (w) { w.reject(e); });
      drainQueue();
    });
  }

  // ---------------------------------------------------------------------------------------
  // coldStart() — ported from tuner.html's COLD() branch (render() lines ~614-634): the
  // dot -> line -> open scaleY/scaleX squish (always), the dim/soft/bloom/unconverged ->
  // settled warm-up staggered by RANK order (via u.delay), and the crtPower glow line draw
  // gated the same way tuner gated it (only when settings.crtPower is true).
  // ---------------------------------------------------------------------------------------
  function coldStart(pageEl, opts) {
    var force = !!(opts && opts.force);
    if (LITE) return Promise.resolve(show(pageEl));
    var warm = false;
    try { warm = !!sessionStorage.getItem('fx-warm'); } catch (e) {}
    if (warm && !force) return Promise.resolve(show(pageEl));

    document.documentElement.classList.add('fx-transitioning');
    return new Promise(function (resolve) {
      ensureSplit(pageEl);
      var units = liveUnits(pageEl);
      units.forEach(function (u) { resetStyleForUnit(u.el); measureUnit(u); });
      assignRandomFor(units, (Math.random() * 1e6) | 0, false);

      var navLv = navRestingLevel(), level = pageRestingLevel(pageEl);
      var t0 = performance.now();
      DEBUG_TICK = tick; DEBUG_T0 = t0;
      // coldPowerLine: the white dot -> line power-on (and the page squish into it). Off for a
      // first visit by default — the warm-up then starts at once, and the time the line stage
      // used is dropped. The power-on button (force) always plays it.
      var withLine = force || S.coldPowerLine;
      var cLine = withLine ? S.coldLine : 0;
      var cMs = withLine ? S.coldMs : S.coldMs * (1 - S.coldLine * 0.6);
      if (withLine) pageEl.style.transformOrigin = '50% 50%';

      function tick(now) {
        var W = innerWidth, H = innerHeight;
        setWarpUniforms(level, W, H);
        setGlassLevel(1); // full tube while warming up, like tuner's COLD() crtLevel = 1
        var tt = Math.min(1, (now - t0) / cMs);
        var start = cLine * 0.6 + S.coldDelay;
        var k = clamp((tt - start) / Math.max(0.01, 1 - start), 0, 1);
        var on = tt >= cLine * 0.6;
        for (var i = 0; i < units.length; i++) {
          var u = units[i];
          var kw = clamp((k - u.delay * S.coldStagger) / Math.max(0.01, 1 - S.coldStagger), 0, 1);
          var e = ease(S.coldEase, kw);
          var cu = {
            blur: S.coldBlur * (1 - e), cp: S.coldConverge * (1 - e), glow: 1 + S.coldBloom * (1 - e),
            op: on ? S.coldDim + (1 - S.coldDim) * e : 0
          };
          var ctx = { navLevel: navLv, crtLevel: level, vEnv: 0, vT: 0, barY: -99999, cu: cu };
          apply(u, 0, 0, ctx);
        }
        var pk = withLine ? 1 - clamp(tt / cLine, 0, 1) : 0;
        if (withLine) powerScale(pageEl, pk);
        drawGlobalPasses(0, (now - t0) / 1000, -99999, W, H, pk, withLine);
        if (tt >= 1) {
          pageEl.style.transform = ''; pageEl.style.transformOrigin = '';
          units.forEach(function (u2) { resetStyleForUnit(u2.el); });
          applyRestingState(pageEl);
          try { sessionStorage.setItem('fx-warm', '1'); } catch (e) {}
          document.documentElement.classList.remove('fx-transitioning');
          // the name catches a tracking wobble just as the tube settles (first visit / power-on)
          if (S.idleOnEnter && pageEl.querySelector('[data-fx-idle]')) {
            setTimeout(function () { idleGlitchNow(pageEl.querySelector('[data-fx-idle]')); }, S.idleEnterDelay);
          }
          resolve();
          return false;
        }
        return true;
      }
      addEffect({ tick: tick });
      // task 6: paint this first (fully "off", collapsed-to-a-dot) frame synchronously, right
      // now, instead of waiting for the next rAF. index.html's boot() removes the fx-boot class
      // that hides <body> immediately after coldStart() returns — it needs the page already
      // looking "off" at that instant, not plain for one more frame while rAF catches up.
      beginGLFrame();
      tick(t0);
    });
  }

  // ---------------------------------------------------------------------------------------
  // task 8 — power-off easter egg. Classic CRT switch-off: the picture collapses into a bright
  // horizontal line (~350ms, brightening as it collapses), the line shrinks into a dot
  // (~250ms), the dot glows then fades (~500ms) to black. Reuses the existing mode-3 power
  // line + powerScale() code paths (forced on, like the cold start) and the grain canvas.
  // ---------------------------------------------------------------------------------------
  var isOff = false;
  function setMainInert(inert) {
    var mains = document.querySelectorAll('main.page');
    for (var i = 0; i < mains.length; i++) {
      if (inert) mains[i].setAttribute('inert', ''); else mains[i].removeAttribute('inert');
    }
  }
  function powerOff(pageEl) {
    if (isOff || !powerOnOverlay) return;
    isOff = true;
    pageEl = pageEl || currentPage;
    document.documentElement.classList.add('fx-off');
    setMainInert(true);
    document.body.style.overflow = 'hidden';
    if (LITE || !pageEl) {
      if (pageEl) { pageEl.style.transition = 'opacity 280ms ease-out'; pageEl.style.opacity = '0'; }
      setTimeout(function () { powerOnOverlay.classList.add('on'); }, pageEl ? 280 : 0);
      return;
    }
    var t0 = performance.now();
    var LINE_MS = 350, DOT_MS = 250, GLOW_MS = 500, total = LINE_MS + DOT_MS + GLOW_MS;
    pageEl.style.transformOrigin = '50% 50%';
    function tick(now) {
      var t = now - t0, W = innerWidth, H = innerHeight;
      var pk;
      if (t <= LINE_MS) pk = (t / LINE_MS) * 0.75;
      else if (t <= LINE_MS + DOT_MS) pk = 0.75 + ((t - LINE_MS) / DOT_MS) * 0.25;
      else pk = 1;
      powerScale(pageEl, pk);
      setGlassLevel(1);
      setWarpUniforms(0, W, H); // centres wc/wh for the mode-3 line — beginGLFrame() runs once
      // per frame in loopTick already; calling it again here would wipe any other effect's
      // draw this same frame.
      drawGlobalPasses(0, t / 1000, -99999, W, H, pk, true);
      if (t > LINE_MS + DOT_MS) {
        var fadeK = Math.min(1, (t - LINE_MS - DOT_MS) / GLOW_MS);
        pageEl.style.opacity = String(Math.max(0, 1 - fadeK));
      }
      if (t >= total) {
        pageEl.style.opacity = '0';
        setTimeout(function () { powerOnOverlay.classList.add('on'); }, 0);
        return false;
      }
      return true;
    }
    addEffect({ tick: tick });
  }
  function powerOn() {
    if (!isOff) return;
    isOff = false;
    powerOnOverlay.classList.remove('on');
    document.documentElement.classList.remove('fx-off');
    setMainInert(false);
    document.body.style.overflow = '';
    var pageEl = currentPage;
    if (pageEl) { pageEl.style.opacity = ''; pageEl.style.transform = ''; pageEl.style.transition = ''; }
    if (LITE || !pageEl) return;
    coldStart(pageEl, { force: true });
  }

  // ---------------------------------------------------------------------------------------
  // show() — first paint without a transition: prepare + apply resting state.
  // ---------------------------------------------------------------------------------------
  function show(pageEl) {
    if (LITE) { currentPage = pageEl; return; }
    applyRestingState(pageEl);
  }

  function refresh(pageEl) {
    if (LITE) return;
    ensureSplit(pageEl); // idempotent: only splits newly-added [data-t]/[data-rule]
    if (currentPage === pageEl) applyRestingState(pageEl);
  }

  // ---------------------------------------------------------------------------------------
  // photo reveal — develop() (IntersectionObserver condense-in) and frame() (viewer dissolve).
  // Three interchangeable looks for develop()'s reveal (frame()'s viewer dissolve always uses
  // grain — not swapped per photoReveal, see CONTRACT): grain (default, WebGL, unchanged),
  // interlaced and darkroom (both pure CSS, ported from design/reveal-lab.html panels B/C).
  // startDevelop is the one place that picks between them.
  // ---------------------------------------------------------------------------------------
  function photoRevealMode() {
    var override = null;
    try { override = new URLSearchParams(location.search).get('reveal'); } catch (e) {}
    if (override === 'interlaced' || override === 'darkroom' || override === 'grain') return override;
    return (S.photoReveal === 'interlaced' || S.photoReveal === 'darkroom' || S.photoReveal === 'grain')
      ? S.photoReveal : 'interlaced';
  }
  function drawPhotoGrain(img, p, seed) {
    if (p <= 0.001) return;
    var r = img.getBoundingClientRect(), pad = 2;
    gl.uniform1f(U.pad, pad);
    setRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
    gl.uniform1f(U.coarse, S.patchRel ? Math.max(6, Math.min(S.coarse, r.height * 1.4)) : S.coarse);
    gl.uniform1f(U.p, p); gl.uniform1f(U.seed, seed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function animatePhoto(img, seed, pFrom, pTo, ms, onProgress) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      var fx = {
        tick: function (now) {
          var t = now - t0, k = Math.min(1, t / ms);
          var p = pFrom + (pTo - pFrom) * k;
          if (onProgress) onProgress(k);
          drawPhotoGrain(img, p, seed);
          if (k >= 1) { resolve(); return false; }
          return true;
        }
      };
      addEffect(fx);
    });
  }

  // developedSrcs/etc are keyed by dataset.src (masonry tiles get their src from photos.js's
  // load queue, which can be long after develop() is called — img.src is empty until then)
  // falling back to img.src itself for anything that isn't queue-loaded (the viewer frame()).
  function keyOf(img) { return img.dataset.src || img.src; }

  var developedSrcs = new Set();
  // grain mode shows an already-developed photo instantly; the CSS reveals (interlaced,
  // darkroom) replay every time a photo enters, so they never fall back to the page
  // transition's grain (see drawUnit — images get no grain outside grain mode).
  function alreadyShown(img) { return REVEAL_MODE === 'grain' && developedSrcs.has(keyOf(img)); }
  var observedImgs = new WeakSet();
  // stays populated from the moment develop() hides an img until its condense-in animation
  // actually finishes (observedImgs alone is cleared as soon as the IO fires, i.e. right
  // before the animation starts — too early for excludeDeveloping's purpose above).
  var developingImgs = new WeakSet();
  var imgState = new WeakMap(); // img -> { loaded, visible } — the two halves of "ready to reveal"
  var readyQueued = new WeakSet(); // already handed to the current reveal batch, don't double-queue
  var readyBatch = [], batchScheduled = false;
  var io = null;
  function ensureIO() {
    if (io || LITE) return;
    // threshold 0.3: reveal only once a photo is meaningfully on screen, not the instant its
    // edge appears (that's also why there's no rootMargin lookahead here — loading is the
    // queue's job, this IO is purely "is it visible enough to show".)
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var img = e.target, st = imgState.get(img);
        if (!st) return;
        st.visible = e.isIntersecting;
        maybeReveal(img, st);
      });
    }, { rootMargin: '0px', threshold: 0.3 });
  }
  // the one place that decides "it's time" — startDevelop (below) is just the reveal style,
  // swappable later without touching this readiness/stagger logic.
  function maybeReveal(img, st) {
    if (!st.loaded || !st.visible) return;
    if (alreadyShown(img) || readyQueued.has(img)) return;
    readyQueued.add(img);
    if (io) io.unobserve(img);
    observedImgs.delete(img);
    readyBatch.push(img);
    if (!batchScheduled) {
      batchScheduled = true;
      requestAnimationFrame(flushReadyBatch);
    }
  }
  // several photos can become ready in the same frame (e.g. a batch of queued loads finishing
  // together) — stagger them in reading order instead of whatever order their events fired in.
  function flushReadyBatch() {
    batchScheduled = false;
    var batch = readyBatch; readyBatch = [];
    batch.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
    batch.forEach(function (img, i) {
      setTimeout(function () {
        readyQueued.delete(img);
        developedSrcs.add(keyOf(img));
        startDevelop(img);
      }, i * 60);
    });
  }
  // small rAF tween for the two CSS-only reveals — same shape as reveal-lab.html's tween(),
  // just without the duration-multiplier/stagger controls that lab doesn't need here.
  function tweenCss(ms, easeName, onFrame) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      function step(now) {
        var k = Math.min(1, (now - t0) / ms);
        onFrame(ease(easeName, k));
        if (k < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  function setClip(img, pct) { var v = 'inset(0 0 ' + pct + '% 0)'; img.style.clipPath = v; img.style.webkitClipPath = v; }
  function setMask(img, v) { img.style.maskImage = v; img.style.webkitMaskImage = v; }

  // grain — today's reveal, unchanged (WebGL condense-in, see animatePhoto/drawPhotoGrain above).
  function revealGrain(img) {
    img.style.filter = 'blur(5px)';
    var seed = Math.random() * 97;
    return animatePhoto(img, seed, 1, 0, 900, function (k) { img.style.filter = 'blur(' + (5 * (1 - k)) + 'px)'; })
      .then(function () { img.style.filter = ''; });
  }
  // interlaced — two fields, like a real interlaced frame: pass 1 sweeps the odd lines in
  // top->bottom, pass 2 sweeps the even lines in top->bottom over them, so the scanlines fill in
  // and the clean photo is already complete when the masks come off (no one-frame snap).
  // Bug fixed: the overlay used to be cloned AFTER the odd-line mask was set, so it inherited
  // that mask, pass 2 drew the same odd lines again, and the gaps vanished in one frame at the end.
  var ODD_LINES = 'repeating-linear-gradient(to bottom, #000 0 1px, transparent 1px 2px)';
  var EVEN_LINES = 'repeating-linear-gradient(to bottom, transparent 0 1px, #000 1px 2px)';
  // the second field: a clone laid exactly over img. In a tile .frame that's inset:0; in the
  // viewer the img is centred inside a bigger .stage, so it takes the img's own offset box.
  function evenField(img) {
    var host = img.parentElement, ov = img.cloneNode(); // clone before any mask/clip lands on img
    ov.removeAttribute('data-i'); ov.removeAttribute('data-src'); ov.removeAttribute('id');
    ov.alt = ''; ov.setAttribute('aria-hidden', 'true');
    ov.style.position = 'absolute'; ov.style.pointerEvents = 'none'; ov.style.opacity = '';
    ov.style.maxWidth = 'none'; ov.style.maxHeight = 'none'; ov.style.margin = '0';
    if (host.classList.contains('frame')) {
      ov.style.inset = '0'; ov.style.width = '100%'; ov.style.height = '100%';
    } else {
      ov.style.left = img.offsetLeft + 'px'; ov.style.top = img.offsetTop + 'px';
      ov.style.width = img.offsetWidth + 'px'; ov.style.height = img.offsetHeight + 'px';
    }
    setMask(ov, EVEN_LINES);
    host.appendChild(ov);
    return ov;
  }
  function clearField(img) { setMask(img, ''); img.style.clipPath = ''; img.style.webkitClipPath = ''; }
  function setClipTop(img, pct) { var v = 'inset(' + pct + '% 0 0 0)'; img.style.clipPath = v; img.style.webkitClipPath = v; }
  function revealInterlaced(img) {
    var overlay = evenField(img);
    setClip(overlay, 100);
    setMask(img, ODD_LINES);
    setClip(img, 100);

    return tweenCss(300, 'out cubic', function (p) { setClip(img, (1 - p) * 100); })
      .then(function () {
        return tweenCss(420, 'in-out sine', function (p) { setClip(overlay, (1 - p) * 100); });
      })
      .then(function () { clearField(img); overlay.remove(); });
  }
  // the reverse, for the viewer's "out" half: split into fields with no visible change, then the
  // even lines sweep out top->bottom, then the odd ones. Leaves img hidden (opacity 0, no masks).
  function unrevealInterlaced(img) {
    var overlay = evenField(img);
    setMask(img, ODD_LINES);
    return tweenCss(200, 'in-out sine', function (p) { setClipTop(overlay, p * 100); })
      .then(function () { return tweenCss(200, 'in cubic', function (p) { setClipTop(img, p * 100); }); })
      .then(function () { img.style.opacity = '0'; clearField(img); overlay.remove(); });
  }
  // darkroom — ported from reveal-lab.html's revealDarkroom (panel C): brightness eases out
  // of black (out-quad) while contrast+sepia ease back to identity (in-cubic). 1100ms.
  function revealDarkroom(img) {
    img.style.filter = 'brightness(0) contrast(1.8) sepia(.35)';
    return tweenCss(1100, 'linear', function (t) {
      var cs = ease('in cubic', t);
      img.style.filter = 'brightness(' + ease('out quad', t) + ') contrast(' + (1.8 - 0.8 * cs) + ') sepia(' + (0.35 - 0.35 * cs) + ')';
    }).then(function () { img.style.filter = ''; });
  }
  // the one swap point for "what a reveal looks like" — readiness/stagger (above) never
  // changes per mode, only this does.
  function startDevelop(img) {
    img.style.opacity = '';
    var frame = img.closest('.frame');
    var p = REVEAL_MODE === 'interlaced' ? revealInterlaced(img)
      : REVEAL_MODE === 'darkroom' ? revealDarkroom(img)
      : revealGrain(img);
    p.then(function () {
      developingImgs.delete(img);
      if (frame) frame.dataset.revealed = '';
    });
  }
  function develop(img) {
    if (LITE) {
      // no animation, no visibility gating — just show it the instant it loads, per CONTRACT.
      var liteFrame = img.closest('.frame');
      var mark = function () { if (liteFrame) liteFrame.dataset.revealed = ''; };
      if (img.complete && img.naturalWidth > 0) mark();
      else { img.addEventListener('load', mark, { once: true }); img.addEventListener('error', mark, { once: true }); }
      return;
    }
    if (alreadyShown(img)) {
      img.style.opacity = '';
      var doneFrame = img.closest('.frame'); if (doneFrame) doneFrame.dataset.revealed = '';
      return;
    }
    img.style.opacity = '0';
    developingImgs.add(img);
    ensureIO();
    var st = { loaded: img.complete && img.naturalWidth > 0, visible: false };
    imgState.set(img, st);
    if (!st.loaded) {
      var onLoad = function () { st.loaded = true; maybeReveal(img, st); };
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onLoad, { once: true }); // broken image still has to stop being invisible
    }
    if (observedImgs.has(img)) return;
    observedImgs.add(img);
    io.observe(img); // IO delivers an initial entry for the current viewport state too
  }

  var frameChain = Promise.resolve(), frameTok = 0;
  function frame(img, src) {
    if (LITE) {
      img.src = src;
      var p = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      return p.then(function () { img.style.opacity = ''; });
    }
    var hadSrc = !!img.src;
    if (REVEAL_MODE === 'interlaced') {
      // fast ← → presses: frames run one at a time and the in-between ones are skipped, so two
      // field sweeps never fight over the same img's mask/clip.
      var tok = ++frameTok;
      frameChain = frameChain.then(function () {
        if (tok !== frameTok) return;
        var q0 = img.src && img.style.opacity !== '0' ? unrevealInterlaced(img) : Promise.resolve();
        return q0.then(function () {
          img.style.opacity = '0';
          img.src = src;
          return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        }).then(function () {
          developedSrcs.add(keyOf(img));
          if (tok !== frameTok) return; // a newer photo was asked for while this one loaded: stay hidden
          img.style.opacity = '';
          return revealInterlaced(img);
        });
      });
      return frameChain;
    }
    var seed = Math.random() * 97;
    var p0 = hadSrc ? animatePhoto(img, seed, 0, 1, 240, null) : Promise.resolve();
    return p0.then(function () {
      img.src = src;
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }).then(function () {
      img.style.filter = 'blur(3px)';
      developedSrcs.add(keyOf(img));
      return animatePhoto(img, seed, 1, 0, 700, function (k) { img.style.filter = 'blur(' + (3 * (1 - k)) + 'px)'; });
    }).then(function () { img.style.filter = ''; });
  }

  // ---------------------------------------------------------------------------------------
  // lite detection
  // ---------------------------------------------------------------------------------------
  function detectLite() {
    if (prefersReducedMotion()) return true;
    var conn = navigator.connection;
    if (conn) {
      if (conn.saveData) return true;
      if (conn.effectiveType && ['slow-2g', '2g', '3g'].indexOf(conn.effectiveType) !== -1) return true;
    }
    if ((navigator.deviceMemory || 8) <= 2) return true;
    return false;
  }

  // ---------------------------------------------------------------------------------------
  // public API
  // ---------------------------------------------------------------------------------------
  var FX = {
    lite: false,
    init: function (settings) {
      S = {}; for (var k in SCHEMA_DEFAULTS) S[k] = SCHEMA_DEFAULTS[k];
      if (settings) for (var k2 in settings) S[k2] = settings[k2];

      LITE = detectLite();
      injectStyle();
      // task 8: the power switch easter egg — off by default (powerSwitch), kept for later
      if (S.powerSwitch) createPowerDom();
      if (!LITE) {
        createDom();
        if (!createGL()) LITE = true;
      }
      FX.lite = LITE;
      try { Object.defineProperty(FX, 'lite', { value: LITE, writable: false }); } catch (e) {}
      // gates the loading-stage CSS animations in the injected photo-reveal CSS — lite never
      // runs per-frame work, and that includes CSS keyframes, not just rAF.
      document.documentElement.classList.toggle('fx-lite', LITE);
      // dev override: ?reveal=interlaced|darkroom|grain (location.search — the hash is the
      // router). CSS keys the reveal-stage look off this attribute, set once, here.
      REVEAL_MODE = photoRevealMode();
      document.documentElement.dataset.reveal = REVEAL_MODE;

      if (LITE) return Promise.resolve();

      addEventListener('resize', scheduleRemeasure);
      try { document.fonts && document.fonts.addEventListener('loadingdone', scheduleRemeasure); } catch (e) {}
      document.addEventListener('load', function (e) {
        var img = e.target;
        if (!img || img.tagName !== 'IMG') return;
        // masonry tiles reserve their box on .frame's aspect-ratio before the queue sets a
        // src, so their image arriving doesn't change layout — skip the remeasure the load
        // queue would otherwise trigger every ~60ms for seconds. Other <img data-i> (project
        // figures) still have no reserved box and need the remeasure.
        if (img.closest('.tile')) return;
        scheduleRemeasure();
      }, true);

      scheduleIdleGlitch(); // task 13
      return loadGrainTexture();
    },
    show: show,
    coldStart: coldStart,
    transition: transition,
    refresh: refresh,
    develop: develop,
    frame: frame,
    powerOff: powerOff,
    // test-only: render the active transition/cold-start effect at a fixed virtual time
    // (ms since the start of its current phase). See CONTRACT verification step.
    _debugFreeze: function (ms) {
      if (!DEBUG_TICK || LITE) return false;
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      beginGLFrame();
      DEBUG_TICK(DEBUG_T0 + ms);
      return true;
    }
  };

  window.FX = FX;
})();
