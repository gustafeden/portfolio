// photos.js — Atelier fetch (Firestore REST, no SDK), masonry, filters, EXIF, viewer.
// Exposes window.Photos = { ready, list, collections, mount, open, close }.
(function () {
  'use strict';

  const KEY = 'AIzaSyBbvGlBtJ8wPTBiBVLDBLOflEuo8H-BJwA';
  const FS = 'https://firestore.googleapis.com/v1/projects/atelier-cms/databases/(default)/documents/';

  // dev-only: ?slow=1500 adds a simulated per-image load delay (±40% random) in the load
  // queue below, before setting src, so the reveal stages are visible even on cached thumbs.
  const SLOW_MS = Math.max(0, +(new URLSearchParams(location.search).get('slow') || 0));

  function val(v) {
    if (!v) return undefined;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) {
      const o = {}; const f = v.mapValue.fields || {};
      for (const k in f) o[k] = val(f[k]);
      return o;
    }
  }

  async function listColl(coll) {
    const out = []; let tok = '';
    do {
      const r = await fetch(`${FS}${coll}?pageSize=300&key=${KEY}${tok ? '&pageToken=' + tok : ''}`);
      const j = await r.json();
      for (const d of j.documents || []) {
        const o = { id: d.name.split('/').pop() };
        for (const k in d.fields) o[k] = val(d.fields[k]);
        out.push(o);
      }
      tok = j.nextPageToken || '';
    } while (tok);
    return out;
  }

  let COLLS = [], PHOTOS = [];
  const ready = (async () => {
    try {
      const [c, p] = await Promise.all([listColl('portfolio_collections'), listColl('portfolio_photos')]);
      COLLS = c.filter(x => x.visible).sort((a, b) => a.order - b.order);
      const vis = new Set(COLLS.map(x => x.id));
      PHOTOS = p.filter(x => vis.has(x.collectionId))
        .sort((a, b) => COLLS.findIndex(cc => cc.id === a.collectionId) -
                        COLLS.findIndex(cc => cc.id === b.collectionId) || a.order - b.order);
    } catch (e) { console.warn('firestore', e); }
    return { photos: PHOTOS, collections: COLLS };
  })();

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const collOf = p => COLLS.find(c => c.id === p.collectionId);
  const camName = s => s ? s.split(/\s{2,}/).pop().replace(/^(RICOH|FUJIFILM|Canon|NIKON CORPORATION|SONY)\s+/i, '') : '';
  function exifOf(p) {
    const e = p.exif || {};
    if (!p.showExif || !Object.keys(e).length) return null;
    return e;
  }
  function exifLine(p) {
    const e = exifOf(p); if (!e) return '';
    return [camName(e.camera), e.lens, e.focalLength, e.aperture, e.shutter, e.iso && 'ISO ' + e.iso]
      .filter(Boolean).map(esc).join(', ');
  }

  // ---------- state ----------
  let filter = 'all', cols = 5, vi = -1;
  let pageEl = null, viewerEl = null, bound = false;
  const current = () => filter === 'all' ? PHOTOS : PHOTOS.filter(p => p.collectionId === filter);

  const dims = new Map();
  function measure(src) {
    if (dims.has(src)) return Promise.resolve(dims.get(src));
    return new Promise(res => {
      const im = new Image();
      im.onload = () => { const r = im.naturalHeight / im.naturalWidth; dims.set(src, r); res(r); };
      im.onerror = () => { dims.set(src, 1); res(1); };
      im.src = src;
    });
  }
  // true once Firestore's CMS backfill has given a photo real width/height.
  const hasDims = p => typeof p.width === 'number' && p.width > 0 && typeof p.height === 'number' && p.height > 0;
  // ratio (height/width) for layout. Firestore docs get width/height once the CMS backfill
  // lands — until then (and for any photo missed by it) this falls back to measure(), which
  // has to load that one thumbnail to learn its shape.
  function ratioOf(p) {
    return hasDims(p) ? Promise.resolve(p.height / p.width) : measure(p.thumbnailSrc || p.src);
  }

  // ---------- load queue: photos.js owns loading, the grid's img[data-i] only ever gets its
  // src from here. One IO + queue per render; torn down and rebuilt on filter/column/resize. ----------
  const loadedUrls = new Set(); // urls already fetched this session (browser cache) — set directly, no queue slot
  let curIO = null;

  function teardownLoadQueue() { if (curIO) { curIO.disconnect(); curIO = null; } }

  function maxConcurrentLoads() {
    if (navigator.connection && navigator.connection.saveData) return 1;
    if (matchMedia('(max-width: 560px), (pointer: coarse)').matches) return 2;
    return 5;
  }

  function setupLoadQueue(root) {
    teardownLoadQueue();
    const max = maxConcurrentLoads();
    const queue = [], loading = new Set();
    let active = 0;

    function byPosition(a, b) {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    }
    function pump() {
      while (active < max && queue.length) {
        queue.sort(byPosition);
        start(queue.shift());
      }
    }
    function start(img) {
      const url = img.dataset.src;
      if (!url || loading.has(img)) return;
      loading.add(img); active++;
      const frame = img.parentElement; // .frame — carries data-load for fx.js's stage CSS
      if (frame) frame.dataset.load = 'loading';
      const done = () => {
        loading.delete(img); active--; loadedUrls.add(url);
        if (frame) frame.dataset.load = 'loaded'; // error lands here too, so nothing hangs
        pump();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      const setSrc = () => { img.src = url; };
      SLOW_MS ? setTimeout(setSrc, SLOW_MS * (0.6 + Math.random() * 0.8)) : setSrc();
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const img = e.target, url = img.dataset.src;
        if (e.isIntersecting) {
          if (loadedUrls.has(url)) {
            io.unobserve(img);
            if (img.src !== url) img.src = url;
            if (img.parentElement) img.parentElement.dataset.load = 'loaded';
            return;
          }
          if (!loading.has(img) && !queue.includes(img)) queue.push(img);
        } else {
          const i = queue.indexOf(img); if (i >= 0) queue.splice(i, 1); // dropped before it started; re-added if it scrolls back in
        }
      });
      pump();
    }, { rootMargin: '0px 0px 100% 0px', threshold: 0 }); // one viewport of lookahead below, none needed above

    root.querySelectorAll('.tile img[data-src]').forEach(img => {
      const url = img.dataset.src;
      if (loadedUrls.has(url)) { // already in browser cache, skip the queue
        img.src = url;
        if (img.parentElement) img.parentElement.dataset.load = 'loaded';
        return;
      }
      io.observe(img);
    });
    curIO = io;
  }

  function renderColls() {
    const root = pageEl.querySelector('#colls');
    const btn = (id, label, n) => `<button data-c="${id}" class="${filter === id ? 'on' : ''}" data-t data-role="structure">${esc(label)}<sup>${n}</sup></button>`;
    root.innerHTML = btn('all', 'all', PHOTOS.length) +
      COLLS.map(c => btn(c.id, c.title, PHOTOS.filter(p => p.collectionId === c.id).length)).join('');
  }

  async function renderMasonry() {
    teardownLoadQueue();
    const list = current();
    const root = pageEl.querySelector('#masonry');
    if (!list.length) { root.innerHTML = '<p class="empty-note">no photos loaded, so the Atelier fetch probably failed</p>'; return; }
    const ratios = await Promise.all(list.map(ratioOf));
    const n = window.innerWidth < 560 ? Math.min(cols, 2) : cols;
    const heights = Array(n).fill(0), buckets = Array.from({ length: n }, () => []);
    list.forEach((p, i) => {
      const c = heights.indexOf(Math.min(...heights));
      buckets[c].push([p, i]); heights[c] += ratios[i] + 0.08;
    });
    root.innerHTML = buckets.map(b => `<div class="col">${b.map(([p, i]) => {
      const ex = exifLine(p);
      // W/H when Firestore has it, else the ratio we just measured — either way the box is
      // reserved (on .frame, not the img) before the <img> has a src, so there's no layout
      // shift once it loads.
      const ar = hasDims(p) ? `${p.width} / ${p.height}` : `1 / ${ratios[i]}`;
      // --ph-c only when the CMS has given this photo an average colour; fx.js's stage CSS
      // falls back to a neutral tone when it's absent (p.color isn't backfilled yet).
      const colorVar = /^#[0-9a-f]{6}$/i.test(p.color || '') ? `;--ph-c:${p.color}` : '';
      return `<button class="tile" data-idx="${i}" aria-label="open photo ${i + 1}">
        <span class="frame" data-load="queued" style="aspect-ratio:${ar}${colorVar}">
          <img data-i data-src="${esc(p.thumbnailSrc || p.src)}" alt="" decoding="async">
        </span>
        <div class="ex" data-t data-role="body">${ex ? `<b>${ex}</b>` : esc(collOf(p)?.title || '')}</div></button>`;
    }).join('')}</div>`).join('');
    const gap = n >= 5 ? 6 : 12;
    root.style.gap = `${gap}px`;
    root.querySelectorAll('.col').forEach(c => c.style.gap = `${gap}px`);
    setupLoadQueue(root);
    root.querySelectorAll('.tile img[data-i]').forEach(img => window.FX.develop(img));
    window.FX.refresh(pageEl);
  }

  // ---------- viewer ----------
  function openViewer(i) {
    const list = current(); if (!list.length) return;
    vi = (i + list.length) % list.length;
    const p = list[vi], c = collOf(p);
    const imgEl = viewerEl.querySelector('#v-img');
    [list[vi + 1], list[vi - 1]].forEach(n => { if (n) new Image().src = n.src; });
    viewerEl.querySelector('#v-count').textContent = `${String(vi + 1).padStart(2, '0')} of ${list.length}`;
    viewerEl.querySelector('#v-coll').textContent = c ? c.title + (c.displayYear ? `, ${c.displayYear}` : '') : '';
    const e = exifOf(p);
    viewerEl.querySelector('#v-exif').innerHTML = e
      ? `<dl>${[['camera', camName(e.camera)], ['lens', e.lens], ['focal', e.focalLength],
          ['aperture', e.aperture], ['shutter', e.shutter], ['iso', e.iso], ['taken', e.date]]
          .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
      : `<p class="noexif">no exif on this one${/mamiya/i.test(c?.title || '') ? ', it is a film scan' : ''}.</p>`;
    viewerEl.querySelector('#v-orig').href = p.src;
    viewerEl.classList.add('on');
    window.FX.frame(imgEl, p.src);
    // Zola: the photographs page itself is a real route (/photographs/); a deep link to one
    // frame is just the hash on that page, not a route of its own (see CONTRACT.md).
    history.replaceState(null, '', `#${p.id}`);
  }
  function closeViewer() {
    if (vi < 0) return;
    viewerEl.classList.remove('on');
    vi = -1;
    history.replaceState(null, '', location.pathname + location.search);
  }

  // ---------- events (bound once) ----------
  function bindOnce() {
    if (bound) return; bound = true;
    document.addEventListener('click', e => {
      const t = e.target;
      const c = t.closest('[data-c]');
      if (c && pageEl && !pageEl.hidden) { filter = c.dataset.c; renderColls(); renderMasonry(); return; }
      const infoBtn = t.closest('[data-info]');
      if (infoBtn && pageEl && !pageEl.hidden) { pageEl.classList.toggle('info'); infoBtn.classList.toggle('on'); return; }
      const tile = t.closest('.tile');
      if (tile && pageEl && !pageEl.hidden) { openViewer(+tile.dataset.idx); return; }
      if (t.closest('#v-close')) { closeViewer(); return; }
      const nav = t.closest('.viewer .nav');
      if (nav) { openViewer(vi + +nav.dataset.step); return; }
      if (t.id === 'v-link') {
        e.preventDefault();
        navigator.clipboard?.writeText(location.href);
        t.textContent = 'copied';
        setTimeout(() => t.textContent = 'copy link to this frame', 1200);
      }
    });
    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.target.tagName === 'INPUT') return;
      const v = vi >= 0;
      if (v && e.key === 'ArrowRight') openViewer(vi + 1);
      else if (v && e.key === 'ArrowLeft') openViewer(vi - 1);
      else if (v && e.key === 'Escape') closeViewer();
      else if (v && e.key === 'i') viewerEl.classList.toggle('noaside');
      else if (!v && pageEl && !pageEl.hidden) {
        if (e.key === 'i') pageEl.querySelector('[data-info]')?.click();
        if (/^[2-6]$/.test(e.key)) { cols = +e.key; renderMasonry(); }
      }
    });
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (pageEl && !pageEl.hidden) renderMasonry(); }, 150);
    });
  }

  // ---------- public API ----------
  async function mount(el) {
    pageEl = el;
    if (!viewerEl) viewerEl = document.getElementById('viewer');
    bindOnce();
    await ready;
    renderColls();
    await renderMasonry();
  }
  function open(id) {
    const list = current();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0 && vi !== i) openViewer(i);
  }
  function close() { closeViewer(); }

  window.Photos = {
    ready,
    list: () => PHOTOS,
    collections: () => COLLS,
    mount, open, close,
  };
})();
