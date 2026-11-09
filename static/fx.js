(function () {
  'use strict';

  var EASES = {
    linear: function (k) {
      return k;
    },
    'in quad': function (k) {
      return k * k;
    },
    'in cubic': function (k) {
      return k * k * k;
    },
    'out quad': function (k) {
      return 1 - (1 - k) * (1 - k);
    },
    'out cubic': function (k) {
      return 1 - Math.pow(1 - k, 3);
    },
    'out expo': function (k) {
      return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
    },
    'in-out sine': function (k) {
      return -(Math.cos(Math.PI * k) - 1) / 2;
    },
    'in-out cubic': function (k) {
      return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    }
  };
  function ease(name, k) {
    var f = EASES[name];
    return f ? f(k) : k;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function prefersReducedMotion() {
    try {
      return !!matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var PAIRS = {
    'red / cyan': ['255,40,60', '0,220,255'],
    'yellow / blue': ['255,230,0', '60,60,255'],
    'magenta / green': ['255,0,200', '0,255,120']
  };

  const FX_PRESET = {
    outMs: 350,
    holdMs: 0,
    inMs: 640,
    outEase: 'in quad',
    inEase: 'out cubic',
    grainScale: 1,
    grainMix: 0.45,
    coarse: 140,
    patchRel: true,
    soft: 0.07,
    smooth: false,
    sweep: 0,
    sweepAngle: 90,
    blurOut: 4,
    blurIn: 6,
    textBlur: 1,
    imgBlur: 1,
    fade: 0,
    drift: 0,
    scale: 1,
    spread: 0.45,
    order: 'structure → text → images',
    mirrorOut: true,
    orderRand: 0.35,
    jitter: 0.35,
    sizeSpeed: 0,
    halo: 0.5,
    tail: 0.45,
    tint: '#A3B18A',
    tintAmt: 0,
    vcr: 0,
    vcrCol: '#D02BD6',
    vcrWidth: 1.5,
    vcrJag: 0,
    vcrPeak: 'mid-transition',
    chroma: 3.2,
    chromaPair: 'red / cyan',
    scan: 0.72,
    scanGap: 5,
    roll: 0,
    rollH: 70,
    rollSpeed: 380,
    snow: 0.43,
    tear: 13,
    crt: 'always',
    crtCurve: 0.57,
    crtRadius: 0,
    crtWarp: 0.02,
    crtScan: 0.15,
    crtScanGap: 2,
    crtMask: 0.78,
    crtMaskType: 'aperture grille',
    crtGlow: 0.92,
    crtFlicker: 0,
    crtRead: 0.25,
    crtNav: 1,
    photosClean: true,
    photoReveal: 'interlaced',
    touch: false,
    touchBloom: 0.09,
    touchRing: 0.05,
    touchStatic: 0.12,
    touchRadius: 38,
    touchRadiusImg: 70,
    idleGlitch: true,
    idleMin: 9000,
    idleMax: 24000,
    idleAmt: 1
  };

  var S = null;
  var LITE = false;
  var REVEAL_MODE = 'interlaced';

  var canvas, crtRoot;
  function createDom() {
    canvas = document.createElement('canvas');
    canvas.id = 'fx-canvas';
    document.body.appendChild(canvas);
    [].forEach.call(
      document.querySelectorAll('[data-fx-glass]'),
      function (host) {
        var glass = document.createElement('div');
        glass.className = 'fx-glass';
        glass.setAttribute('aria-hidden', 'true');
        glass.style.setProperty('--crt-curve', S.crtCurve);
        glass.style.setProperty('--crt-r', S.crtRadius + 'px');
        glass.innerHTML = '<i class="fx-vig"></i><i class="fx-bezel"></i>';
        host.appendChild(glass);
      }
    );
    crtRoot = document.createElement('div');
    crtRoot.id = 'fx-crt';
    crtRoot.setAttribute('aria-hidden', 'true');
    crtRoot.innerHTML =
      '<i class="fx-scan"></i><i class="fx-vig"></i>' +
      (S.crtFlicker > 0 ? '<i class="fx-flick"></i>' : '') +
      '<i class="fx-bezel"></i>';
    document.body.appendChild(crtRoot);
  }

  function setGlassLevel(level) {
    if (!crtRoot) return;
    crtRoot.style.display = level > 0.001 ? 'block' : 'none';
    crtRoot.style.setProperty('--crt-on', level);
    crtRoot.style.setProperty('--crt-r', S.crtRadius * level + 'px');
    crtRoot.style.setProperty('--crt-scan', S.crtScan * 0.55);
    crtRoot.style.setProperty('--crt-gap', S.crtScanGap + 'px');
    crtRoot.style.setProperty('--crt-mask', S.crtMask);
    crtRoot.style.setProperty('--crt-curve', S.crtCurve);
    crtRoot.style.setProperty('--crt-flick', S.crtFlicker * 0.05);
  }

  var gl = null,
    U = null,
    tex = null;
  function compileShader(context, type, source) {
    var shader = context.createShader(type);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      console.warn('[fx] shader', context.getShaderInfoLog(shader));
    }
    return shader;
  }
  const VERTEX_SHADER = `
attribute vec2 q;
uniform vec4 quad;
uniform vec2 res;
varying vec2 spx;

void main() {
  spx = quad.xy + q * quad.zw;
  vec2 c = spx / res * 2. - 1.;
  gl_Position = vec4(c.x, -c.y, 0, 1);
}
`;

  const FRAGMENT_SHADER = `
precision highp float;
varying vec2 spx;
uniform sampler2D grainTex;
uniform vec4 rect;
uniform float warpK;
uniform vec2 wc, wh;
uniform float p, seed, grainScale, grainMix, coarse, soft, sweep, tintAmt, pad;
uniform vec2 dir;
uniform vec3 tint;
uniform int mode;
uniform float vAmt, vX, vWidth, vJag, vTime;
uniform vec3 vCol;
uniform float scanAmt, scanGap, rollAmt, barY, barH, snowAmt;
uniform vec2 touchPos;
uniform float touchR, touchAmt, touchBloomA, touchRingA, touchStaticA, touchTime;

float h(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+1.), f.x), f.y);
}

void main() {
  vec2 nn = (spx - wc) / wh;
  float r2 = dot(nn, nn);
  vec2 px = spx + wh * warpK * nn * r2;

  if (mode == 4) {
    vec2 dd = spx - touchPos;
    float rr = length(dd) / max(touchR, 1.);
    float bloom = exp(-rr * rr * 2.2) * touchBloomA * touchAmt;
    float ring = exp(-pow((rr - .8) / .12, 2.)) * touchRingA * touchAmt;
    float hue = atan(dd.y, dd.x) / 6.2831853 + touchTime * .15;
    vec3 rainbow = .5 + .5 * cos(6.2831853 * (hue + vec3(0., .3333, .6667)));
    float sn2 = h(floor(spx * .5) + floor(touchTime * 24.) * 13.7);
    float sparkle = step(.985, sn2) * touchStaticA * touchAmt * smoothstep(1., .2, rr);
    vec3 col = vec3(.93) * bloom + rainbow * ring + vec3(1.) * sparkle;
    float al = clamp(bloom + ring * .6 + sparkle, 0., 1.);
    gl_FragColor = vec4(col, al);
    return;
  }

  if (mode == 0 && (px.x < rect.x || px.y < rect.y || px.x > rect.x + rect.z || px.y > rect.y + rect.w)) discard;

  if (mode == 1) {
    float band = floor(px.y / 6.);
    float wob = (h(vec2(band, floor(vTime * 24.))) - .5) * vJag;
    float d = abs(px.x - vX - wob);
    float line = smoothstep(vWidth, 0., d) * (.75 + .25 * h(vec2(band * 3.1, vTime)));
    float drop = step(.12, h(vec2(floor(px.y / 40.), floor(vTime * 12.))));
    float al = line * drop * vAmt;
    gl_FragColor = vec4(vCol * al, al);
    return;
  }

  if (mode == 2) {
    float sl = scanAmt * .55 * (.5 + .5 * cos(6.2831853 * px.y / scanGap));
    float d = (px.y - barY) / barH, bar = exp(-d * d * 4.) * rollAmt;
    float sn = h(floor(px * vec2(.5, 1.)) + floor(vTime * 60.) * 13.7);
    float w = bar * snowAmt * step(.62, sn) * sn + bar * .07;
    gl_FragColor = vec4(vec3(w), clamp(sl + w * (1. - sl), 0., 1.));
    return;
  }

  float g = texture2D(grainTex, (px / grainScale + seed * 37.) / 256.).r;
  float c = vn((px + seed * 101.) / coarse);
  float n = grainMix * g + (1. - grainMix) * c;
  vec2 l = (px - rect.xy) / max(rect.zw, vec2(1.));
  float ramp = clamp(dot(l - .5, dir) + .5, 0., 1.);
  n = mix(n, .7 * ramp + .3 * g, sweep);
  float e = p * (1. + 2. * soft + .1) - soft - .05;
  float a = smoothstep(n - soft, n, e);
  float bd = min(min(px.x - rect.x, rect.x + rect.z - px.x), min(px.y - rect.y, rect.y + rect.w - px.y));
  float edge = a * (1. - a) * 4. * tintAmt * smoothstep(0., max(pad, 1.), bd);
  float al = max(a, edge);
  gl_FragColor = vec4(mix(vec3(14./255.), tint, edge) * al, al);
}
`;
  function createGL() {
    canvas.getContext &&
      (gl = canvas.getContext('webgl', { antialias: false }));
    if (!gl) return false;
    var prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(
      prog,
      compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    );
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    var ql = gl.getAttribLocation(prog, 'q');
    gl.enableVertexAttribArray(ql);
    gl.vertexAttribPointer(ql, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // Shader output uses premultiplied alpha.
    U = {};
    [
      'quad',
      'warpK',
      'wc',
      'wh',
      'scanAmt',
      'scanGap',
      'rollAmt',
      'barY',
      'barH',
      'snowAmt',
      'mode',
      'vAmt',
      'vX',
      'vWidth',
      'vJag',
      'vTime',
      'vCol',
      'rect',
      'res',
      'pad',
      'p',
      'seed',
      'grainScale',
      'grainMix',
      'coarse',
      'soft',
      'sweep',
      'tintAmt',
      'dir',
      'tint',
      'touchPos',
      'touchR',
      'touchAmt',
      'touchBloomA',
      'touchRingA',
      'touchStaticA',
      'touchTime'
    ].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
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
    var noise = new Uint8Array(256 * 256),
      random = rng(200);
    for (var i = 0; i < noise.length; i++) {
      noise[i] = Math.round(((random() + random() + random()) * 255) / 3);
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      256,
      256,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      noise
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    setFilter();
    return Promise.resolve();
  }
  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  var WARP = 0,
    NAV_WARP = 0,
    WC = [0, 0],
    WH = [1, 1];
  function unitWarp(u) {
    return u.nav ? NAV_WARP : WARP;
  }
  function warpFwd(x, y, k) {
    if (k == null) k = WARP;
    var sx = x,
      sy = y;
    for (var i = 0; i < 5; i++) {
      var nx = (sx - WC[0]) / WH[0],
        ny = (sy - WC[1]) / WH[1],
        r2 = nx * nx + ny * ny;
      sx = x - WH[0] * k * nx * r2;
      sy = y - WH[1] * k * ny * r2;
    }
    return [sx, sy];
  }
  function quadMatrix(w, h, P) {
    var x0 = P[0][0],
      y0 = P[0][1],
      x1 = P[1][0],
      y1 = P[1][1],
      x2 = P[2][0],
      y2 = P[2][1],
      x3 = P[3][0],
      y3 = P[3][1];
    var dx1 = x1 - x2,
      dx2 = x3 - x2,
      dx3 = x0 - x1 + x2 - x3,
      dy1 = y1 - y2,
      dy2 = y3 - y2,
      dy3 = y0 - y1 + y2 - y3;
    var g = 0,
      hh = 0;
    if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
      var det = dx1 * dy2 - dx2 * dy1;
      g = (dx3 * dy2 - dx2 * dy3) / det;
      hh = (dx1 * dy3 - dx3 * dy1) / det;
    }
    var a = (x1 - x0 + g * x1) / w,
      b = (x3 - x0 + hh * x3) / h,
      d = (y1 - y0 + g * y1) / w,
      e = (y3 - y0 + hh * y3) / h;
    return (
      'matrix3d(' +
      a +
      ',' +
      d +
      ',0,' +
      g / w +
      ',' +
      b +
      ',' +
      e +
      ',0,' +
      hh / h +
      ',0,0,1,0,' +
      x0 +
      ',' +
      y0 +
      ',0,1)'
    );
  }
  function warpTransform(u, tx, ty, sc) {
    var r = u.box || u.rect,
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2,
      k = unitWarp(u);
    var corners = [
      [r.left, r.top],
      [r.right, r.top],
      [r.right, r.bottom],
      [r.left, r.bottom]
    ];
    var P = corners.map(function (xy) {
      var x = xy[0],
        y = xy[1];
      var w = warpFwd(cx + (x - cx) * sc + tx, cy + (y - cy) * sc + ty, k);
      return [w[0] - r.left, w[1] - r.top];
    });
    return quadMatrix(r.width || 1, r.height || 1, P);
  }
  function setRect(x, y, w, h, k) {
    if (k == null) k = WARP;
    gl.uniform4f(U.rect, x, y, w, h);
    if (k > 0) {
      var c = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x + w / 2, y],
        [x + w / 2, y + h],
        [x, y + h / 2],
        [x + w, y + h / 2]
      ].map(function (p) {
        return warpFwd(p[0], p[1], k);
      });
      var xs = c.map(function (p) {
          return p[0];
        }),
        ys = c.map(function (p) {
          return p[1];
        }),
        m = 3;
      var l = Math.min.apply(null, xs) - m,
        t = Math.min.apply(null, ys) - m;
      gl.uniform4f(
        U.quad,
        l,
        t,
        Math.max.apply(null, xs) + m - l,
        Math.max.apply(null, ys) + m - t
      );
    } else gl.uniform4f(U.quad, x, y, w, h);
  }

  var fillCache = new Map();
  function phosphorFill(c, m) {
    var key = c + '|' + m.toFixed(2) + S.crtMaskType;
    if (fillCache.has(key)) return fillCache.get(key);
    var nums = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    var r = nums[0] || 0,
      g = nums[1] || 0,
      b = nums[2] || 0,
      a = nums[3] === undefined ? 1 : nums[3];
    var k = 1 - 0.65 * m;
    function col(R, G, B) {
      return 'rgba(' + (R | 0) + ',' + (G | 0) + ',' + (B | 0) + ',' + a + ')';
    }
    var f =
      'repeating-linear-gradient(90deg, ' +
      col(r, g * k, b * k) +
      ' 0 1px, ' +
      col(r * k, g, b * k) +
      ' 1px 2px, ' +
      col(r * k, g * k, b) +
      ' 2px 3px)';
    if (S.crtMaskType === 'slot mask')
      f =
        'repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,' +
        0.5 * m +
        ') 2px 3px), ' +
        f;
    fillCache.set(key, f);
    return f;
  }
  function phosphorAvg(c, m) {
    var nums = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    var r = nums[0] || 0,
      g = nums[1] || 0,
      b = nums[2] || 0,
      a = nums[3] === undefined ? 1 : nums[3];
    var f = (1 + 2 * (1 - 0.65 * m)) / 3;
    return (
      'rgba(' +
      ((r * f) | 0) +
      ',' +
      ((g * f) | 0) +
      ',' +
      ((b * f) | 0) +
      ',' +
      a +
      ')'
    );
  }

  var NOSPLIT_TAGS = {
    KBD: 1,
    INPUT: 1,
    BUTTON: 1,
    SELECT: 1,
    TEXTAREA: 1,
    SVG: 1
  };
  function splitText(el) {
    (function walk(node) {
      var kids = [].slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var n = kids[i];
        if (n.nodeType === 1) {
          if (!NOSPLIT_TAGS[n.tagName]) walk(n);
          continue;
        }
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        var frag = document.createDocumentFragment();
        var parts = n.textContent.split(/(\s+)/);
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j];
          if (!p) continue;
          if (/^\s+$/.test(p)) {
            frag.appendChild(document.createTextNode(p));
            continue;
          }
          var s = document.createElement('span');
          s.className = 'u';
          s.textContent = p;
          s.dataset.text = p;
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
      for (var s = 0; s < SEG_COUNT; s++)
        html += '<i class="fx-rseg" data-s></i>';
      r.innerHTML = html;
      r.setAttribute('data-fx-ruled', '');
    }
  }

  function collectUnits(pageEl, viewportOnly) {
    var sel = '.u, [data-i], [data-s], [data-nosplit]';
    var list = [].slice
      .call(pageEl.querySelectorAll(sel))
      .filter(function (el) {
        return !el.closest('[data-fx-ghost]');
      });
    if (viewportOnly) {
      list = list.filter(function (el) {
        var r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.bottom > -innerHeight * 0.2 &&
          r.top < innerHeight * 1.2
        );
      });
    }
    return list.map(function (el) {
      var kind = el.hasAttribute('data-i')
        ? 'img'
        : el.hasAttribute('data-s')
          ? 'rule'
          : 'text';
      var roleEl = el.closest ? el.closest('[data-role]') : null;
      var role =
        kind === 'img'
          ? 'img'
          : kind === 'rule'
            ? 'structure'
            : (roleEl ? roleEl.dataset.role : 'body') || 'body';
      var nav = !!(el.closest && el.closest('[data-nav]'));
      return { el: el, kind: kind, role: role, nav: nav };
    });
  }

  // Page effects must not repaint images still owned by an active photo reveal.
  function excludeDeveloping(list) {
    return list.filter(function (u) {
      return !(u.kind === 'img' && developingImgs.has(u.el));
    });
  }

  function liveUnits(pageEl) {
    return excludeDeveloping(collectUnits(pageEl, true));
  }

  function transitionUnits(pageEl) {
    var units = liveUnits(pageEl);
    if (pageEl.dataset.crt !== 'read') return units;
    var groups = new Map();
    return units.reduce(function (result, u) {
      var body = u.el.closest('[data-role="body"]');
      if (
        u.kind !== 'text' ||
        !body ||
        body.hasAttribute('data-nosplit') ||
        body.querySelector('[data-i]')
      ) {
        result.push(u);
        return result;
      }
      var parent = body.parentElement.closest('[data-role="body"]');
      if (parent) body = parent;
      if (groups.has(body)) return result;
      groups.set(body, true);
      body.querySelectorAll('.u').forEach(resetStyleForUnit);
      result.push({
        el: body,
        kind: 'text',
        role: 'body',
        nav: false,
        group: true
      });
      return result;
    }, []);
  }

  function resetStyleForUnit(el) {
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.filter = '';
    el.style.opacity = '';
    el.style.color = '';
    el.style.textShadow = '';
    el.classList.remove('ph');
    el.style.removeProperty('--ph');
  }

  function measureRect(u) {
    var bx = u.el.getBoundingClientRect();
    u.box = bx;
    if (u.el.classList.contains('u')) {
      var cs = getComputedStyle(u.el),
        pt = parseFloat(cs.paddingTop),
        pl = parseFloat(cs.paddingLeft);
      u.rect = new DOMRect(
        bx.left + pl,
        bx.top + pt,
        bx.width - 2 * pl,
        bx.height - 2 * pt
      );
    } else u.rect = bx;
  }

  // Suppress hover colors during measurement so they cannot become the permanent phosphor ink.
  var measuring = false;
  function measuringOn() {
    if (measuring) return;
    measuring = true;
    document.documentElement.classList.add('fx-measuring');
    Promise.resolve().then(function () {
      document.documentElement.classList.remove('fx-measuring');
      measuring = false;
    });
  }
  function measureUnit(u) {
    measureRect(u);
    if (u.kind === 'text') {
      measuringOn();
      var nodes = [u.el].concat(
        [].slice.call(
          u.el.querySelectorAll(u.group ? 'a, em, strong, code' : '*')
        )
      );
      u.inks = nodes.map(function (n) {
        return [n, getComputedStyle(n).color];
      });
      var fpx = parseFloat(getComputedStyle(u.el).fontSize) || 15;
      u.sizeK = clamp((fpx - 11) / (28 - 11), 0.3, 1);
    }
  }

  var RANK = { structure: 0, head: 1, body: 2, img: 3 };
  function orderKey(u, i, list, rank) {
    var W = innerWidth,
      H = innerHeight;
    switch (S.order) {
      case 'reading':
        return i / Math.max(1, list.length - 1);
      case 'random':
        return u.r1;
      case 'top → bottom':
        return u.rect.top / H;
      case 'left → right':
        return u.rect.left / W;
      case 'bottom → top':
        return 1 - u.rect.bottom / H;
      default:
        return (rank + u.r2 * 0.9) / 4;
    }
  }
  function assignRandomFor(list, seed, mirror) {
    var R = rng(seed);
    list.forEach(function (u, i) {
      u.r1 = R();
      u.r2 = R();
      u.g = R() * 97;
      var rank = RANK[u.role];
      if (rank === undefined) rank = 2;
      if (mirror) rank = 3 - rank;
      var key = orderKey(u, i, list, rank);
      u.delay = clamp(key + (u.r1 - key) * S.orderRand, 0, 1);
      u.sizeF =
        1 +
        (Math.min(1.5, Math.max(0.35, u.rect.height / 60)) - 1) * S.sizeSpeed;
    });
  }
  function local(u, t, P) {
    if (u._lateOut) {
      var start2 = P * 0.7,
        len2 = Math.max(1, P * 0.3);
      return clamp((t - start2) / len2, 0, 1);
    }
    var len = P * (1 - S.spread) * (1 + S.jitter * (u.r2 * 2 - 1)) * u.sizeF;
    var start = P * S.spread * u.delay;
    return clamp((t - start) / Math.max(1, len), 0, 1);
  }

  function vhsAt(y, ctx) {
    var d = (y - ctx.barY) / Math.max(1, S.rollH);
    return Math.exp(-d * d * 4) * (S.roll > 0 ? 1 : 0);
  }
  function apply(u, p, blurMax, ctx) {
    var crtU = u.nav ? ctx.navLevel : ctx.crtLevel || 0;
    var mult = u.kind === 'img' ? S.imgBlur : S.textBlur;
    var cu = ctx.cu;
    var b = cu ? cu.blur : p * blurMax * mult;
    if (u.kind === 'text') {
      var sizeK = u.sizeK == null ? 1 : u.sizeK;
      var on = b > 0.05;
      var near = vhsAt(u.rect.top + u.rect.height / 2, ctx);
      var cp = cu
        ? cu.cp
        : S.chroma * ctx.vEnv * (0.6 + 0.4 * near + 0.8 * near);
      var pair = PAIRS[S.chromaPair],
        c1 = pair[0],
        c2 = pair[1];
      for (var i = 0; i < u.inks.length; i++) {
        var n = u.inks[i][0],
          c = u.inks[i][1];
        var shArr = [],
          m = S.crtMask * crtU * sizeK,
          ink = phosphorAvg(c, m > 0.02 ? m : 0);
        if (on) shArr.push('0 0 ' + b * 2 + 'px ' + ink);
        if (cp > 0.05) {
          shArr.push(
            -cp + 'px 0 ' + (on ? b * 2 : 0) + 'px rgba(' + c1 + ',.7)'
          );
          shArr.push(
            cp + 'px 0 ' + (on ? b * 2 : 0) + 'px rgba(' + c2 + ',.7)'
          );
        }
        var glowBoost = u._lateOut ? 1.35 : 1;
        var gm = cu ? cu.glow : 1,
          ga = Math.min(1, 0.45 * S.crtGlow * crtU * gm * sizeK * glowBoost);
        if (S.crtGlow > 0 && crtU > 0) {
          shArr.push(
            '0 0 ' +
              (3 + S.crtGlow * 9) * (0.6 + 0.4 * gm) * sizeK * glowBoost +
              'px ' +
              ink.replace(/,[\d.]+\)$/, ',' + ga + ')')
          );
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
    var t0 = 1 - S.tail,
      tailK = p <= t0 ? 1 : 1 - (p - t0) / Math.max(0.001, S.tail);
    var op = Math.min(1 - p * S.fade, tailK);
    u.el.style.opacity = cu
      ? cu.op < 1
        ? cu.op
        : ''
      : p >= 0.995
        ? 0
        : op < 1
          ? op
          : '';
    var ty = p * S.drift,
      sc = 1 + (S.scale - 1) * p,
      tx = 0;
    if (S.tear > 0 && ctx.vEnv > 0) {
      var band = Math.floor((u.rect.top + u.rect.height / 2) / 6),
        fr = Math.floor(ctx.vT * 24);
      var j = (Math.sin(band * 12.9898 + fr * 78.233) * 43758.5453) % 1;
      tx =
        S.tear *
        ctx.vEnv *
        (vhsAt(u.rect.top + u.rect.height / 2, ctx) * (0.6 + 0.4 * j) +
          0.08 * j);
    }
    u.tx = tx;
    if (unitWarp(u) > 0) {
      u.el.style.transformOrigin = '0 0';
      u.el.style.transform = warpTransform(u, tx, ty, sc);
    } else {
      u.el.style.transformOrigin = '';
      u.el.style.transform =
        ty || tx || sc !== 1
          ? 'translate(' + tx + 'px, ' + ty + 'px) scale(' + sc + ')'
          : '';
    }
    return b;
  }

  function drawUnit(u, p, blurMax, ctx) {
    var b = apply(u, p, blurMax, ctx);
    if (p <= 0.001) return;
    if (u.kind === 'img' && REVEAL_MODE !== 'grain') return;
    var pad = b * S.halo + 1,
      r = u.rect,
      ty = p * S.drift;
    var vpad = pad + (u.kind === 'text' ? r.height * 0.15 : 0);
    gl.uniform1f(U.pad, pad);
    var k = unitWarp(u);
    if (k !== WARP) gl.uniform1f(U.warpK, k);
    setRect(
      r.left - pad + (u.tx || 0),
      r.top - vpad + ty,
      r.width + pad * 2,
      r.height + vpad * 2,
      k
    );
    gl.uniform1f(
      U.coarse,
      S.patchRel ? Math.max(6, Math.min(S.coarse, r.height * 1.4)) : S.coarse
    );
    gl.uniform1f(U.p, p);
    gl.uniform1f(U.seed, u.g);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (k !== WARP) gl.uniform1f(U.warpK, WARP);
  }

  function beginGLFrame() {
    var W = innerWidth,
      H = innerHeight;
    var dpr = Math.min(devicePixelRatio || 1, 1, Math.sqrt(750000 / (W * H)));
    var cw = (W * dpr) | 0,
      ch = (H * dpr) | 0;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.grainScale, S.grainScale);
    gl.uniform1f(U.grainMix, S.grainMix);
    gl.uniform1f(U.coarse, S.coarse);
    gl.uniform1f(U.soft, S.soft);
    gl.uniform1f(U.sweep, S.sweep);
    var ang = (S.sweepAngle * Math.PI) / 180;
    gl.uniform2f(U.dir, Math.cos(ang), Math.sin(ang));
    gl.uniform3fv(U.tint, hexRgb(S.tint));
    gl.uniform1f(U.tintAmt, S.tintAmt);
    return { W: W, H: H };
  }
  function setWarpUniforms(level, W, H, navLevel) {
    WARP = S.crtWarp * level;
    NAV_WARP = S.crtWarp * (navLevel == null ? navRestingLevel() : navLevel);
    WC = [W / 2, H / 2];
    WH = [W / 2, H / 2];
    gl.uniform1f(U.warpK, WARP);
    gl.uniform2f(U.wc, WC[0], WC[1]);
    gl.uniform2f(U.wh, WH[0], WH[1]);
  }
  function vhsEnvelope(elapsed, outMs, holdMs, inMs) {
    var tot = outMs + holdMs + inMs,
      k = elapsed / tot,
      tIn = elapsed - outMs - holdMs;
    switch (S.vcrPeak) {
      case 'out only':
        return elapsed < outMs ? Math.sin((Math.PI * elapsed) / outMs) : 0;
      case 'in only':
        return tIn > 0 ? Math.sin(Math.PI * Math.min(1, tIn / inMs)) : 0;
      case 'whole time':
        return k > 0 && k < 1 ? 1 : 0;
      default:
        return Math.sin(Math.PI * clamp(k, 0, 1));
    }
  }
  function drawGlobalPasses(vEnv, vT, barY, W, H) {
    if (S.vcr > 0 && vEnv > 0.001) {
      var R = rng((Math.random() * 1e6) | 0);
      gl.uniform1i(U.mode, 1);
      gl.uniform4f(U.rect, 0, 0, W, H);
      gl.uniform1f(U.vAmt, S.vcr * vEnv);
      gl.uniform1f(U.vX, W * (0.55 + R() * 0.42));
      gl.uniform1f(U.vWidth, S.vcrWidth);
      gl.uniform1f(U.vJag, S.vcrJag);
      gl.uniform1f(U.vTime, vT);
      gl.uniform3fv(U.vCol, hexRgb(S.vcrCol));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.uniform1i(U.mode, 0);
    }
    if ((S.scan > 0 || S.roll > 0) && vEnv > 0.001) {
      gl.uniform1i(U.mode, 2);
      setRect(0, 0, W, H);
      gl.uniform1f(U.scanAmt, S.scan * vEnv);
      gl.uniform1f(U.scanGap, S.scanGap);
      gl.uniform1f(U.rollAmt, S.roll * vEnv);
      gl.uniform1f(U.barY, barY);
      gl.uniform1f(U.barH, S.rollH);
      gl.uniform1f(U.snowAmt, S.snow);
      gl.uniform1f(U.vTime, vT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.uniform1i(U.mode, 0);
    }
  }

  var activeEffects = new Set();
  var rafId = null;
  function loopTick(now) {
    rafId = null;
    if (activeEffects.size === 0) return;
    beginGLFrame();
    activeEffects.forEach(function (fx) {
      var alive;
      try {
        alive = fx.tick(now);
      } catch (e) {
        console.error('[fx]', e);
        alive = false;
      }
      if (!alive) activeEffects.delete(fx);
    });
    if (activeEffects.size > 0) ensureLoop();
    else gl.clear(gl.COLOR_BUFFER_BIT);
  }
  function ensureLoop() {
    if (rafId == null) rafId = requestAnimationFrame(loopTick);
  }
  function addEffect(fx) {
    activeEffects.add(fx);
    ensureLoop();
  }

  var DEBUG_TICK = null,
    DEBUG_T0 = 0;

  var TOUCH_SEL = 'a[href], button, .tile, figure';
  var touchTarget = null,
    touchLeaving = false;
  var touchX = 0,
    touchY = 0,
    touchTX = 0,
    touchTY = 0,
    touchAmt = 0;
  var touchEnterT0 = 0,
    touchLeaveT0 = 0,
    touchPressT0 = 0;
  var touchEffect = null,
    touchHavePos = false;
  function touchAllowed() {
    if (LITE || !gl || !S.touch) return false;
    return !prefersReducedMotion();
  }
  function touchRadiusFor(el) {
    return el && el.closest && el.closest('.tile, figure')
      ? S.touchRadiusImg
      : S.touchRadius;
  }
  function ensureTouchEffect() {
    if (touchEffect) return;
    touchEffect = {
      tick: function (now) {
        touchX += (touchTX - touchX) * 0.35;
        touchY += (touchTY - touchY) * 0.35;
        var k;
        if (touchLeaving) {
          k = Math.min(1, (now - touchLeaveT0) / 250);
          touchAmt = 1 - k;
        } else {
          k = Math.min(1, (now - touchEnterT0) / 150);
          touchAmt = k;
        }
        var press = touchPressT0
          ? Math.max(0, 1 - (now - touchPressT0) / 120)
          : 0;
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
        if (touchLeaving && k >= 1) {
          touchEffect = null;
          return false;
        }
        return true;
      }
    };
    addEffect(touchEffect);
  }
  document.addEventListener(
    'pointermove',
    function (e) {
      if (e.pointerType === 'touch' || !touchAllowed()) return;
      touchTX = e.clientX;
      touchTY = e.clientY;
      if (!touchHavePos) {
        touchX = touchTX;
        touchY = touchTY;
        touchHavePos = true;
      }
      var t = e.target && e.target.closest ? e.target.closest(TOUCH_SEL) : null;
      if (t === touchTarget) return;
      if (t) {
        touchTarget = t;
        touchLeaving = false;
        touchEnterT0 = performance.now();
        ensureTouchEffect();
      } else if (touchTarget) {
        touchTarget = null;
        touchLeaving = true;
        touchLeaveT0 = performance.now();
        ensureTouchEffect();
      }
    },
    { passive: true }
  );
  document.addEventListener(
    'pointerdown',
    function (e) {
      if (e.pointerType === 'touch' || !touchTarget) return;
      touchPressT0 = performance.now();
    },
    true
  );

  var idleTimer = null;
  function idleGlitchBlocked(el) {
    if (LITE || !S.idleGlitch || !el || !el.offsetParent) return true;
    if (prefersReducedMotion()) return true;
    if (document.visibilityState === 'hidden') return true;
    if (document.documentElement.classList.contains('fx-transitioning'))
      return true;
    try {
      if (el.matches(':hover')) return true;
    } catch (e) {}
    return false;
  }
  function scheduleIdleGlitch() {
    clearTimeout(idleTimer);
    if (LITE || !S.idleGlitch) return;
    var delay = S.idleMin + Math.random() * Math.max(0, S.idleMax - S.idleMin);
    idleTimer = setTimeout(runIdleGlitchAttempt, delay);
  }
  var IDLE_BANDS = 18;
  function runIdleGlitchBurst(el) {
    if (!el.querySelector('.u')) return 0;
    var dur = 520 + Math.random() * 380;
    var t0 = performance.now();
    var amp = (9 + Math.random() * 7) * S.idleAmt;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var freq = 9 + Math.random() * 6,
      phase = Math.random() * 6.283;
    var r = el.getBoundingClientRect();

    var ov = document.createElement('div');
    ov.setAttribute('data-fx-ghost', '');
    ov.setAttribute('aria-hidden', 'true');
    ov.style.cssText =
      'position:absolute;pointer-events:none;margin:0;width:' +
      r.width +
      'px;height:' +
      r.height +
      'px;';
    el.parentNode.insertBefore(ov, el.nextSibling);
    var o = ov.getBoundingClientRect();
    ov.style.transform =
      'translate(' + (r.left - o.left) + 'px,' + (r.top - o.top) + 'px)';

    var bands = [];
    for (var i = 0; i < IDLE_BANDS; i++) {
      var c = el.cloneNode(true);
      c.removeAttribute('data-fx-idle');
      c.removeAttribute('data-t');
      c.style.cssText +=
        ';position:absolute;left:0;top:0;margin:0;width:' +
        r.width +
        'px;visibility:visible;';
      // Edge bands extend beyond the box to preserve accents, ascenders and descenders.
      var y0 = i === 0 ? -60 : (i / IDLE_BANDS) * 100,
        y1 = i === IDLE_BANDS - 1 ? 160 : ((i + 1) / IDLE_BANDS) * 100;
      c.style.clipPath =
        'polygon(-20% ' +
        y0 +
        '%, 120% ' +
        y0 +
        '%, 120% ' +
        y1 +
        '%, -20% ' +
        y1 +
        '%)';
      var words = [].slice.call(c.querySelectorAll('.u'));
      bands.push({
        el: c,
        y: (i + 0.5) / IDLE_BANDS,
        words: words,
        sh: words.map(function (w) {
          return w.style.textShadow;
        })
      });
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
        if (
          k >= 1 ||
          document.documentElement.classList.contains('fx-transitioning') ||
          prefersReducedMotion()
        ) {
          done();
          return false;
        }
        var env = Math.sin(Math.PI * clamp(k, 0, 1));
        var crest = -0.35 + 1.7 * k;
        var fr = Math.floor(now / 33);
        for (var i = 0; i < bands.length; i++) {
          var b = bands[i],
            dy = (b.y - crest) / 0.32;
          var w = Math.exp(-dy * dy);
          var jit = (Math.sin(i * 12.9898 + fr * 78.233) * 43758.5453) % 1;
          var x =
            dir *
            amp *
            env *
            (w * Math.sin(b.y * freq + phase + k * 7) + 0.18 * jit * w);
          b.el.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
          var cs = Math.min(3, Math.abs(x) * 0.35);
          var ghost =
            cs > 0.2
              ? (-cs).toFixed(2) +
                'px 0 rgba(255,40,60,.55), ' +
                cs.toFixed(2) +
                'px 0 rgba(0,220,255,.55)'
              : '';
          for (var j = 0; j < b.words.length; j++) {
            var base = b.sh[j];
            b.words[j].style.textShadow = ghost
              ? base
                ? base + ', ' + ghost
                : ghost
              : base;
          }
        }
        return true;
      }
    });
    return dur;
  }
  function runIdleGlitchAttempt() {
    var el = document.querySelector('[data-fx-idle]');
    if (idleGlitchBlocked(el)) {
      scheduleIdleGlitch();
      return;
    }
    var dur = runIdleGlitchBurst(el);
    if (dur && Math.random() < 0.25)
      setTimeout(function () {
        if (!idleGlitchBlocked(el)) runIdleGlitchBurst(el);
      }, dur + 80);
    scheduleIdleGlitch();
  }

  var currentPage = null;
  var scrollCleanup = null;

  var lastActivated = null;
  function closestActivatable(el) {
    return el && el.closest ? el.closest('a[href], button, [data-i]') : null;
  }
  document.addEventListener(
    'pointerdown',
    function (e) {
      var t = closestActivatable(e.target);
      if (t) lastActivated = t;
    },
    true
  );
  document.addEventListener(
    'click',
    function (e) {
      var t = closestActivatable(e.target);
      if (t) lastActivated = t;
    },
    true
  );
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = closestActivatable(document.activeElement);
      if (t) lastActivated = t;
    },
    true
  );

  function crtLevelFor(pageEl) {
    var kind = pageEl.dataset.crt;
    if (kind === 'read') return S.crtRead;
    return 1;
  }
  function pageRestingLevel(pageEl) {
    if (S.crt === 'off' || S.crt === 'transition only') return 0;
    return crtLevelFor(pageEl);
  }
  function navRestingLevel() {
    return S.crt === 'always' ? S.crtNav : 0;
  }

  function applyPhotosZ(pageEl) {
    if (pageEl.dataset.crt !== 'photos') return;
    var imgs = pageEl.querySelectorAll('[data-i]');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].style.position = 'relative';
      imgs[i].style.zIndex = '7';
    }
  }

  function restingCtx(pageEl) {
    var level = pageRestingLevel(pageEl);
    return {
      navLevel: navRestingLevel(),
      crtLevel: level,
      vEnv: 0,
      vT: 0,
      barY: -99999,
      cu: null
    };
  }

  // Scroll measures geometry only; phosphor ink must be measured with FX styles reset.
  function updateUnitTransform(u) {
    if (unitWarp(u) > 0) {
      u.el.style.transformOrigin = '0 0';
      u.el.style.transform = warpTransform(u, 0, 0, 1);
    } else if (u.el.style.transform) {
      u.el.style.transformOrigin = '';
      u.el.style.transform = '';
    }
  }

  function setupWarpScrollListener(pageEl, warpOK) {
    if (scrollCleanup) {
      scrollCleanup();
      scrollCleanup = null;
    }
    if (!warpOK) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var units = liveUnits(pageEl).filter(function (u) {
          return unitWarp(u) > 0;
        });
        units.forEach(measureRect);
        units.forEach(updateUnitTransform);
      });
    }
    addEventListener('scroll', onScroll, { passive: true });
    scrollCleanup = function () {
      removeEventListener('scroll', onScroll);
    };
  }

  function applyRestingState(pageEl) {
    if (LITE) {
      currentPage = pageEl;
      return;
    }
    ensureSplit(pageEl);
    var level = pageRestingLevel(pageEl);
    var warpOK = pageEl.dataset.crt !== 'read' && S.crtWarp * level >= 0.004;
    var navWarpOK = S.crtWarp * navRestingLevel() >= 0.004;
    WARP = warpOK ? S.crtWarp * level : 0;
    NAV_WARP = navWarpOK ? S.crtWarp * navRestingLevel() : 0;
    WC = [innerWidth / 2, innerHeight / 2];
    WH = [innerWidth / 2, innerHeight / 2];
    var ctx = restingCtx(pageEl);
    var units = liveUnits(pageEl);
    units.forEach(function (u) {
      resetStyleForUnit(u.el);
    });
    units.forEach(measureUnit);
    units.forEach(function (u) {
      apply(u, 0, 0, ctx);
    });
    applyPhotosZ(pageEl);
    setGlassLevel(level);
    setupWarpScrollListener(pageEl, warpOK || navWarpOK);
    currentPage = pageEl;
  }

  var remeasureT = null;
  function scheduleRemeasure() {
    if (LITE || !currentPage) return;
    clearTimeout(remeasureT);
    remeasureT = setTimeout(function () {
      if (currentPage) applyRestingState(currentPage);
    }, 60);
  }

  function runOneFull(fromEl, toEl, swap, incomingOnly) {
    return new Promise(function (resolve, reject) {
      ensureSplit(fromEl);
      var baseSeed = (Math.random() * 1e6) | 0;
      var outUnits = transitionUnits(fromEl);
      outUnits.forEach(function (u) {
        resetStyleForUnit(u.el);
      });
      outUnits.forEach(measureUnit);
      assignRandomFor(outUnits, baseSeed * 7919, S.mirrorOut);

      var clicked = lastActivated;
      lastActivated = null;
      if (clicked && fromEl.contains(clicked)) {
        outUnits.forEach(function (u) {
          if (clicked === u.el || clicked.contains(u.el)) u._lateOut = true;
        });
      }

      var fromCrt = pageRestingLevel(fromEl),
        toCrt = pageRestingLevel(toEl);
      var navLv = navRestingLevel();
      var tot = S.outMs + S.holdMs + S.inMs;

      var state = 'out',
        t0 = performance.now(),
        holdT0 = 0,
        inT0 = 0,
        inUnits = null;
      DEBUG_TICK = tick;
      DEBUG_T0 = t0;

      function elapsedTotal(now) {
        if (state === 'out') return now - t0;
        if (state === 'hold') return S.outMs + (now - holdT0);
        if (state === 'swapping') return S.outMs + S.holdMs;
        return S.outMs + S.holdMs + (now - inT0);
      }

      function tick(now) {
        var W = innerWidth,
          H = innerHeight;
        var elapsed = elapsedTotal(now);
        var kk = clamp(elapsed / tot, 0, 1),
          mixAB = kk * kk * (3 - 2 * kk);
        var sceneLv = fromCrt + (toCrt - fromCrt) * mixAB;
        var vEnv = vhsEnvelope(elapsed, S.outMs, S.holdMs, S.inMs);
        var crtLevel =
          S.crt === 'always' ? sceneLv : S.crt === 'transition only' ? vEnv : 0;
        var navLevel =
          S.crt === 'always'
            ? navLv
            : S.crt === 'transition only'
              ? vEnv * S.crtNav
              : 0;
        setWarpUniforms(crtLevel, W, H, navLevel);
        setGlassLevel(crtLevel);
        var vT = elapsed / 1000;
        var barY = ((vT * S.rollSpeed) % (H + S.rollH * 2)) - S.rollH;
        var ctx = {
          navLevel: navLevel,
          crtLevel: crtLevel,
          vEnv: vEnv,
          vT: vT,
          barY: barY,
          cu: null
        };

        if (state === 'out') {
          var t = prefersReducedMotion() ? S.outMs : now - t0;
          for (var i = 0; i < outUnits.length; i++) {
            var u = outUnits[i];
            var p = ease(S.outEase, local(u, t, S.outMs));
            drawUnit(u, p, S.blurOut, ctx);
          }
          drawGlobalPasses(vEnv, vT, barY, W, H);
          if (t >= S.outMs) {
            for (var j = 0; j < outUnits.length; j++)
              outUnits[j].el.style.opacity = '0';
            fromEl.style.transform = '';
            if (S.holdMs > 0) {
              state = 'hold';
              holdT0 = now;
              DEBUG_T0 = now;
            } else beginSwap(now);
          }
        } else if (state === 'hold') {
          drawGlobalPasses(vEnv, vT, barY, W, H, 0);
          if (now - holdT0 >= S.holdMs) beginSwap(now);
        } else if (state === 'swapping') {
          return false;
        } else if (state === 'in') {
          var t2 = prefersReducedMotion() ? S.inMs : now - inT0;
          for (var k2 = 0; k2 < inUnits.length; k2++) {
            var u2 = inUnits[k2];
            var p2 = 1 - ease(S.inEase, local(u2, t2, S.inMs));
            drawUnit(u2, p2, S.blurIn, ctx);
          }
          drawGlobalPasses(vEnv, vT, barY, W, H);
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
        // Resume rendering only after asynchronous page initialization finishes.
        toEl.style.visibility = 'hidden';
        Promise.resolve()
          .then(function () {
            return swap();
          })
          .then(function () {
            ensureSplit(toEl);
            inUnits = transitionUnits(toEl);
            inUnits.forEach(function (u) {
              resetStyleForUnit(u.el);
            });
            inUnits.forEach(measureUnit);
            assignRandomFor(inUnits, baseSeed * 7919 + 5000, false);
            var W = innerWidth,
              H = innerHeight;
            setWarpUniforms(toCrt, W, H);
            setGlassLevel(toCrt);
            var preCtx = {
              navLevel: navLv,
              crtLevel: toCrt,
              vEnv: 0,
              vT: 0,
              barY: -99999,
              cu: null
            };
            beginGLFrame();
            inUnits.forEach(function (u) {
              drawUnit(u, 1, S.blurIn, preCtx);
            });
            toEl.style.visibility = '';
            state = 'in';
            inT0 = performance.now();
            DEBUG_T0 = inT0;
            addEffect(effect);
          })
          .catch(function (err) {
            activeEffects.delete(effect);
            reject(err);
          });
      }

      function finalize() {
        outUnits.forEach(function (u) {
          resetStyleForUnit(u.el);
        });
        if (inUnits)
          inUnits.forEach(function (u) {
            resetStyleForUnit(u.el);
          });
        applyRestingState(toEl);
      }

      var effect = { tick: tick };
      if (incomingOnly) beginSwap(t0);
      else addEffect(effect);
    });
  }

  function tween(el, fromOp, toOp, ms) {
    return new Promise(function (res) {
      var t0 = performance.now();
      function step(now) {
        var k = prefersReducedMotion() ? 1 : Math.min(1, (now - t0) / ms);
        el.style.opacity = String(fromOp + (toOp - fromOp) * k);
        if (k < 1) requestAnimationFrame(step);
        else res();
      }
      requestAnimationFrame(step);
    });
  }
  function runOneLite(fromEl, toEl, swap) {
    return tween(fromEl, 1, 0, S.outMs)
      .then(function () {
        return swap();
      })
      .then(function () {
        toEl.style.opacity = '0';
        return tween(toEl, 0, 1, S.inMs);
      })
      .then(function () {
        toEl.style.opacity = '';
        fromEl.style.opacity = '';
        show(toEl);
      });
  }

  function runOne(fromEl, toEl, swap) {
    document.documentElement.classList.add('fx-transitioning');
    var p = prefersReducedMotion()
      ? Promise.resolve()
          .then(swap)
          .then(function () {
            show(toEl);
          })
      : LITE
        ? runOneLite(fromEl, toEl, swap)
        : runOneFull(fromEl, toEl, swap);
    return p.then(
      function (v) {
        document.documentElement.classList.remove('fx-transitioning');
        return v;
      },
      function (e) {
        document.documentElement.classList.remove('fx-transitioning');
        throw e;
      }
    );
  }

  var busy = false,
    pendingReq = null,
    pendingWaiters = [];
  function transition(fromEl, toEl, swap) {
    return new Promise(function (resolve, reject) {
      if (busy) {
        pendingReq = { fromEl: fromEl, toEl: toEl, swap: swap };
        pendingWaiters.push({ resolve: resolve, reject: reject });
        return;
      }
      busy = true;
      runOne(fromEl, toEl, swap)
        .then(resolve, reject)
        .then(drainQueue, drainQueue);
    });
  }
  function drainQueue() {
    if (!pendingReq) {
      busy = false;
      return;
    }
    var req = pendingReq;
    pendingReq = null;
    var waiters = pendingWaiters;
    pendingWaiters = [];
    runOne(req.fromEl, req.toEl, req.swap).then(
      function () {
        waiters.forEach(function (w) {
          w.resolve();
        });
        drainQueue();
      },
      function (e) {
        waiters.forEach(function (w) {
          w.reject(e);
        });
        drainQueue();
      }
    );
  }

  function show(pageEl) {
    if (LITE) {
      currentPage = pageEl;
      pageEl.querySelectorAll('[data-rule]').forEach(function (r) {
        r.style.background = 'var(--border)';
      });
      if (crtRoot) setGlassLevel(pageRestingLevel(pageEl));
      return;
    }
    applyRestingState(pageEl);
  }

  function reveal(pageEl) {
    if (prefersReducedMotion() || LITE) {
      show(pageEl);
      return prefersReducedMotion()
        ? Promise.resolve()
        : tween(pageEl, 0, 1, S.inMs).then(function () {
            pageEl.style.opacity = '';
          });
    }
    var blank = document.createElement('main');
    blank.dataset.crt = pageEl.dataset.crt;
    return runOneFull(blank, pageEl, function () {}, true);
  }

  function refresh(pageEl) {
    if (LITE) return;
    ensureSplit(pageEl);
    if (currentPage === pageEl) applyRestingState(pageEl);
  }

  function photoRevealMode() {
    var override = null;
    try {
      override = new URLSearchParams(location.search).get('reveal');
    } catch (e) {}
    if (
      override === 'interlaced' ||
      override === 'darkroom' ||
      override === 'grain'
    )
      return override;
    return S.photoReveal === 'interlaced' ||
      S.photoReveal === 'darkroom' ||
      S.photoReveal === 'grain'
      ? S.photoReveal
      : 'interlaced';
  }
  function drawPhotoGrain(img, p, seed) {
    if (p <= 0.001) return;
    var r = img.getBoundingClientRect(),
      pad = 2;
    gl.uniform1f(U.pad, pad);
    setRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
    gl.uniform1f(
      U.coarse,
      S.patchRel ? Math.max(6, Math.min(S.coarse, r.height * 1.4)) : S.coarse
    );
    gl.uniform1f(U.p, p);
    gl.uniform1f(U.seed, seed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function animatePhoto(img, seed, pFrom, pTo, ms, onProgress) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      var fx = {
        tick: function (now) {
          var t = now - t0,
            k = Math.min(1, t / ms);
          var p = pFrom + (pTo - pFrom) * k;
          if (onProgress) onProgress(k);
          drawPhotoGrain(img, p, seed);
          if (k >= 1) {
            resolve();
            return false;
          }
          return true;
        }
      };
      addEffect(fx);
    });
  }

  function keyOf(img) {
    return img.dataset.src || img.src;
  }

  var developedSrcs = new Set();
  function alreadyShown(img) {
    return REVEAL_MODE === 'grain' && developedSrcs.has(keyOf(img));
  }
  var observedImgs = new WeakSet();
  // Reveal ownership lasts through animation completion, beyond the observation lifetime.
  var developingImgs = new WeakSet();
  var imgState = new WeakMap();
  var readyQueued = new WeakSet();
  var readyBatch = [],
    batchScheduled = false;
  var io = null;
  function ensureIO() {
    if (io || LITE) return;
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var img = e.target,
            st = imgState.get(img);
          if (!st) return;
          st.visible = e.isIntersecting;
          maybeReveal(img, st);
        });
      },
      { rootMargin: '0px', threshold: 0.3 }
    );
  }
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
  function flushReadyBatch() {
    batchScheduled = false;
    var batch = readyBatch;
    readyBatch = [];
    batch.sort(function (a, b) {
      var ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect();
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
  function tweenCss(ms, easeName, onFrame) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      function step(now) {
        var k = prefersReducedMotion() ? 1 : Math.min(1, (now - t0) / ms);
        onFrame(ease(easeName, k));
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  function setClip(img, pct) {
    var v = 'inset(0 0 ' + pct + '% 0)';
    img.style.clipPath = v;
    img.style.webkitClipPath = v;
  }
  function setMask(img, v) {
    img.style.maskImage = v;
    img.style.webkitMaskImage = v;
  }

  function revealGrain(img) {
    img.style.filter = 'blur(5px)';
    var seed = Math.random() * 97;
    return animatePhoto(img, seed, 1, 0, 900, function (k) {
      img.style.filter = 'blur(' + 5 * (1 - k) + 'px)';
    }).then(function () {
      img.style.filter = '';
    });
  }
  var ODD_LINES =
    'repeating-linear-gradient(to bottom, #000 0 1px, transparent 1px 2px)';
  var EVEN_LINES =
    'repeating-linear-gradient(to bottom, transparent 0 1px, #000 1px 2px)';
  function evenField(img) {
    var host = img.parentElement,
      ov = img.cloneNode(); // Clone before masking the original to avoid inheriting its odd-field mask.
    ov.removeAttribute('data-i');
    ov.removeAttribute('data-src');
    ov.removeAttribute('id');
    ov.alt = '';
    ov.setAttribute('aria-hidden', 'true');
    ov.style.position = 'absolute';
    ov.style.pointerEvents = 'none';
    ov.style.opacity = '';
    ov.style.maxWidth = 'none';
    ov.style.maxHeight = 'none';
    ov.style.margin = '0';
    if (host.classList.contains('frame')) {
      ov.style.inset = '0';
      ov.style.width = '100%';
      ov.style.height = '100%';
    } else {
      ov.style.left = img.offsetLeft + 'px';
      ov.style.top = img.offsetTop + 'px';
      ov.style.width = img.offsetWidth + 'px';
      ov.style.height = img.offsetHeight + 'px';
    }
    setMask(ov, EVEN_LINES);
    host.appendChild(ov);
    return ov;
  }
  function clearField(img) {
    setMask(img, '');
    img.style.clipPath = '';
    img.style.webkitClipPath = '';
  }
  function setClipTop(img, pct) {
    var v = 'inset(' + pct + '% 0 0 0)';
    img.style.clipPath = v;
    img.style.webkitClipPath = v;
  }
  function revealInterlaced(img) {
    var overlay = evenField(img);
    setClip(overlay, 100);
    setMask(img, ODD_LINES);
    setClip(img, 100);

    return tweenCss(300, 'out cubic', function (p) {
      setClip(img, (1 - p) * 100);
    })
      .then(function () {
        return tweenCss(420, 'in-out sine', function (p) {
          setClip(overlay, (1 - p) * 100);
        });
      })
      .then(function () {
        clearField(img);
        overlay.remove();
      });
  }
  function unrevealInterlaced(img) {
    var overlay = evenField(img);
    setMask(img, ODD_LINES);
    return tweenCss(200, 'in-out sine', function (p) {
      setClipTop(overlay, p * 100);
    })
      .then(function () {
        return tweenCss(200, 'in cubic', function (p) {
          setClipTop(img, p * 100);
        });
      })
      .then(function () {
        img.style.opacity = '0';
        clearField(img);
        overlay.remove();
      });
  }
  function revealDarkroom(img) {
    img.style.filter = 'brightness(0) contrast(1.8) sepia(.35)';
    return tweenCss(1100, 'linear', function (t) {
      var cs = ease('in cubic', t);
      img.style.filter =
        'brightness(' +
        ease('out quad', t) +
        ') contrast(' +
        (1.8 - 0.8 * cs) +
        ') sepia(' +
        (0.35 - 0.35 * cs) +
        ')';
    }).then(function () {
      img.style.filter = '';
    });
  }
  function startDevelop(img) {
    img.style.opacity = '';
    var frame = img.closest('.frame');
    var p =
      REVEAL_MODE === 'interlaced'
        ? revealInterlaced(img)
        : REVEAL_MODE === 'darkroom'
          ? revealDarkroom(img)
          : revealGrain(img);
    p.then(function () {
      developingImgs.delete(img);
      if (frame) frame.dataset.revealed = '';
      if (currentPage && currentPage.contains(img)) scheduleRemeasure();
    });
  }
  function develop(img) {
    if (LITE || prefersReducedMotion()) {
      var liteFrame = img.closest('.frame');
      var mark = function () {
        if (liteFrame) liteFrame.dataset.revealed = '';
      };
      if (img.complete && img.naturalWidth > 0) mark();
      else {
        img.addEventListener('load', mark, { once: true });
        img.addEventListener('error', mark, { once: true });
      }
      return;
    }
    if (alreadyShown(img)) {
      img.style.opacity = '';
      var doneFrame = img.closest('.frame');
      if (doneFrame) doneFrame.dataset.revealed = '';
      return;
    }
    img.style.opacity = '0';
    developingImgs.add(img);
    ensureIO();
    var st = { loaded: img.complete && img.naturalWidth > 0, visible: false };
    imgState.set(img, st);
    if (!st.loaded) {
      var onLoad = function () {
        st.loaded = true;
        maybeReveal(img, st);
      };
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onLoad, { once: true });
    }
    if (observedImgs.has(img)) return;
    observedImgs.add(img);
    io.observe(img);
  }

  var frameChain = Promise.resolve(),
    frameTok = 0;
  function frame(img, src) {
    if (LITE || prefersReducedMotion()) {
      img.src = src;
      var p = img.decode
        ? img.decode().catch(function () {})
        : Promise.resolve();
      return p.then(function () {
        img.style.opacity = '';
      });
    }
    var hadSrc = !!img.src;
    if (REVEAL_MODE === 'interlaced') {
      var tok = ++frameTok;
      frameChain = frameChain.then(function () {
        if (tok !== frameTok) return;
        var q0 =
          img.src && img.style.opacity !== '0'
            ? unrevealInterlaced(img)
            : Promise.resolve();
        return q0
          .then(function () {
            img.style.opacity = '0';
            img.src = src;
            return img.decode
              ? img.decode().catch(function () {})
              : Promise.resolve();
          })
          .then(function () {
            developedSrcs.add(keyOf(img));
            if (tok !== frameTok) return;
            img.style.opacity = '';
            return revealInterlaced(img);
          });
      });
      return frameChain;
    }
    var seed = Math.random() * 97;
    var p0 = hadSrc
      ? animatePhoto(img, seed, 0, 1, 240, null)
      : Promise.resolve();
    return p0
      .then(function () {
        img.src = src;
        return img.decode
          ? img.decode().catch(function () {})
          : Promise.resolve();
      })
      .then(function () {
        img.style.filter = 'blur(3px)';
        developedSrcs.add(keyOf(img));
        return animatePhoto(img, seed, 1, 0, 700, function (k) {
          img.style.filter = 'blur(' + 3 * (1 - k) + 'px)';
        });
      })
      .then(function () {
        img.style.filter = '';
      });
  }

  function detectLite() {
    return prefersReducedMotion();
  }

  var FX = {
    lite: false,
    init: function () {
      S = FX_PRESET;

      LITE = detectLite();
      if (!LITE) {
        createDom();
        if (!createGL()) LITE = true;
      }
      FX.lite = LITE;
      try {
        Object.defineProperty(FX, 'lite', { value: LITE, writable: false });
      } catch (e) {}
      document.documentElement.classList.toggle('fx-lite', LITE);
      REVEAL_MODE = photoRevealMode();
      document.documentElement.dataset.reveal = REVEAL_MODE;

      if (LITE) return Promise.resolve();

      addEventListener('resize', scheduleRemeasure);
      try {
        document.fonts &&
          document.fonts.addEventListener('loadingdone', scheduleRemeasure);
      } catch (e) {}
      document.addEventListener(
        'load',
        function (e) {
          var img = e.target;
          if (!img || img.tagName !== 'IMG') return;
          // Tile frames reserve layout before loading; project figures still need remeasurement.
          if (img.closest('.tile')) return;
          scheduleRemeasure();
        },
        true
      );

      scheduleIdleGlitch();
      return loadGrainTexture();
    },
    show: show,
    reveal: reveal,
    transition: transition,
    refresh: refresh,
    develop: develop,
    frame: frame,
    _debugFreeze: function (ms) {
      if (!DEBUG_TICK || LITE) return false;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      beginGLFrame();
      DEBUG_TICK(DEBUG_T0 + ms);
      return true;
    }
  };

  window.FX = FX;
})();
