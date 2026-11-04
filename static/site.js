// site.js — Zola port of the mockup's inline router/boot (design/site/index.html) plus the
// page swapper needed now that pages are real documents instead of hidden siblings.
// Owns: markRoles (FX markup conventions on server-rendered markdown), per-page init, the
// same-origin click interceptor, navigate()/prefetch/popstate, and boot(). See CONTRACT.md.
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------
  // markRoles — give Zola's rendered markdown (page.content) the same data-t/data-role/
  // data-rule/data-nosplit conventions the mockup's content.js mdBlocks() baked into its HTML
  // strings. Anything the template already marked server-side (ledger spans, path nav, the
  // h1 pulled from page.title, …) is left as-is; this only has to touch markdown output.
  // ---------------------------------------------------------------------------------------
  function markRoles(main) {
    var doc = main.ownerDocument;

    // image + italic-caption pairs (`![alt](src)` on one line, `*caption*` directly below it,
    // no blank line between) are one paragraph with a soft line break in CommonMark, so Zola's
    // renderer emits a single <p><img>\n<em>caption</em></p> — not the two elements the
    // mockup's own renderer (content.js's mdBlocks(), same `![alt](text)` source pattern) baked
    // directly into <figure><img data-i>+<figcaption data-t data-role="body">. Rebuild that
    // shape here so the image is markup-identical to the mockup's figures and takes part in
    // FX's photo reveal (develop(), the interlaced photoReveal setting) the same way
    // photos.js's masonry tiles do.
    Array.prototype.slice.call(main.querySelectorAll('p')).forEach(function (p) {
      var kids = Array.prototype.filter.call(p.childNodes, function (n) {
        return n.nodeType !== 3 || n.textContent.trim(); // drop whitespace-only text nodes (the soft break)
      });
      if (kids.length !== 2) return;
      var img = kids[0], em = kids[1];
      if (!img || img.nodeType !== 1 || img.tagName !== 'IMG') return;
      if (!em || em.nodeType !== 1 || em.tagName !== 'EM') return;

      var fig = doc.createElement('figure');
      img.setAttribute('data-i', '');
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      var figcaption = doc.createElement('figcaption');
      figcaption.setAttribute('data-t', '');
      figcaption.setAttribute('data-role', 'body');
      figcaption.innerHTML = em.innerHTML;
      fig.appendChild(img);
      fig.appendChild(figcaption);
      p.replaceWith(fig);
      if (window.FX && window.FX.develop) window.FX.develop(img);
    });

    main.querySelectorAll('h1, h2, h3').forEach(function (h) {
      h.setAttribute('data-t', '');
      h.setAttribute('data-role', 'head');
      h.removeAttribute('id'); // Zola adds anchor ids; the mockup's renderer never did
    });
    main.querySelectorAll('p, li, blockquote, th, td').forEach(function (el) {
      el.setAttribute('data-t', '');
      el.setAttribute('data-role', 'body');
    });
    main.querySelectorAll('pre').forEach(function (el) {
      el.setAttribute('data-t', '');
      el.setAttribute('data-role', 'body');
      el.setAttribute('data-nosplit', '');
      var code = el.querySelector('code[data-lang]');
      if (code) code.removeAttribute('data-lang'); // Zola's fence-language hint; mdBlocks never kept it
    });

    // Zola renders a thematic break as <hr>; the mockup's mdBlocks() emitted a div FX paints
    // segments into instead. Swap so FX's [data-rule] handling (site.css + fx.js) still applies.
    Array.prototype.slice.call(main.querySelectorAll('hr')).forEach(function (hr) {
      var rule = doc.createElement('div');
      rule.className = 'rule';
      rule.setAttribute('data-rule', '');
      hr.replaceWith(rule);
    });

    // inline markdown images (none in current content, kept for parity with mdBlocks' figures)
    main.querySelectorAll('article img, .doc img').forEach(function (img) {
      if (!img.hasAttribute('data-i')) img.setAttribute('data-i', '');
    });
  }

  // ---------------------------------------------------------------------------------------
  // atelierFigures — the mockup's content.js picks two live Atelier photos to illustrate its
  // project page (content.js lines ~501-531). That's runtime Firestore data, not something
  // Zola can bake in at build time, so this is the "tiny runtime hook" the port keeps: same
  // selection logic, same markup, spliced into the server-rendered <article data-doc> before
  // the 2nd and 4th <h2> once window.Photos has data. No-op (same as the mockup) if the
  // Atelier fetch hasn't loaded anything.
  // ---------------------------------------------------------------------------------------
  async function insertAtelierFigures(main) {
    var docEl = main.querySelector('[data-doc]');
    if (!docEl || docEl.querySelector('figure')) return; // already inserted (e.g. re-init)

    var photos = [], colls = [];
    try {
      if (window.Photos && window.Photos.ready) await window.Photos.ready;
      photos = (window.Photos && window.Photos.list()) || [];
      colls = (window.Photos && window.Photos.collections()) || [];
    } catch (e) {}
    if (!photos.length) return;

    var collOf = function (p) { return colls.find(function (c) { return c.id === p.collectionId; }); };
    var night = photos.filter(function (p) { var c = collOf(p); return c && /mamiya/i.test(c.title || ''); });
    var withExif = photos.filter(function (p) { return p.showExif && p.exif && Object.keys(p.exif).length; });
    var wide = night[0] || photos[0];
    var inlinePhoto = withExif.find(function (p) { return p !== wide; }) || photos.find(function (p) { return p !== wide; }) || photos[1];

    function makeFigure(p, cls, caption) {
      if (!p) return null;
      var fig = document.createElement('figure');
      fig.setAttribute('class', cls || ''); // mockup emits class="" for the inline figure too
      var img = document.createElement('img');
      img.setAttribute('data-i', '');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = p.thumbnailSrc || p.src;
      img.alt = '';
      var cap = document.createElement('figcaption');
      cap.setAttribute('data-t', '');
      cap.setAttribute('data-role', 'body');
      cap.textContent = caption;
      fig.appendChild(img);
      fig.appendChild(cap);
      return fig;
    }

    var h2s = Array.prototype.slice.call(docEl.querySelectorAll('h2'));
    // insert the wide figure right before the 2nd h2 ("How It Works") — end of the first section
    var wideFig = makeFigure(wide, 'wide', 'The Mamiya night set, uploaded from a phone on the way home.');
    if (h2s[1] && wideFig) docEl.insertBefore(wideFig, h2s[1]);
    // insert the inline figure before the 4th h2 ("Multi-User Ready") — later in the doc
    var inlineFig = makeFigure(inlinePhoto, '', 'A frame from the same pipeline, at column width.');
    if (h2s[3] && inlineFig) docEl.insertBefore(inlineFig, h2s[3]);
  }

  // ---------------------------------------------------------------------------------------
  // per-page init — what the old router's preparePage() did per route.
  // ---------------------------------------------------------------------------------------
  async function initPage(main, hash) {
    if (main.dataset.page === 'photographs') {
      await window.Photos.mount(main);
      var id = (hash || '').replace(/^#/, '');
      if (id) window.Photos.open(id);
      else window.Photos.close();
    } else if (main.dataset.page === 'project') {
      if (main.dataset.slug === 'atelier') await insertAtelierFigures(main);
      if (window.Stats) await window.Stats.render(main); // fills any live-stats slot(s) in this page, no-op if none
    }
  }

  // ---------------------------------------------------------------------------------------
  // page-view tracking ids — IDENTICAL to the old SPA's router.js (section ids 'front',
  // 'about', 'projects', 'photos', and `projects_${slug}` for a project detail) so analytics
  // history stays continuous across the rewrite. See CONTRACT.md.
  // ---------------------------------------------------------------------------------------
  function pageIdFor(main) {
    switch (main.dataset.page) {
      case 'home': return 'front';
      case 'project': return 'projects_' + main.dataset.slug;
      case 'photographs': return 'photos';
      default: return main.dataset.page; // 'about', 'projects'
    }
  }

  // ---------------------------------------------------------------------------------------
  // state
  // ---------------------------------------------------------------------------------------
  var currentMain = null;
  var currentPath = ''; // pathname + search of the page currently shown (hash excluded)
  var cache = new Map(); // "pathname+search" -> Promise<{doc, main}>
  var CACHE_CAP = 20;

  function cacheGet(key) { return cache.get(key); }
  function cacheSet(key, value) {
    cache.set(key, value);
    while (cache.size > CACHE_CAP) {
      var oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
  }

  function fetchPage(key) {
    var existing = cacheGet(key);
    if (existing) return existing;
    var p = fetch(key, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('fetch failed: ' + res.status);
      return res.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var main = doc.querySelector('main.page');
      if (!main) throw new Error('no main.page in response for ' + key);
      return { doc: doc, main: main };
    });
    cacheSet(key, p);
    p.catch(function () { cache.delete(key); }); // never let a failed fetch poison the cache
    return p;
  }

  // ---------------------------------------------------------------------------------------
  // link classification
  // ---------------------------------------------------------------------------------------
  function splitUrl(raw) {
    var i = raw.indexOf('#');
    return i === -1 ? { path: raw, hash: '' } : { path: raw.slice(0, i), hash: raw.slice(i) };
  }

  function isInternalNavigableLink(a) {
    if (!a || !a.getAttribute('href')) return false;
    if (a.target || a.hasAttribute('download')) return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    var lastSeg = url.pathname.split('/').pop();
    if (lastSeg.indexOf('.') !== -1) {
      var ext = lastSeg.split('.').pop().toLowerCase();
      if (ext !== 'html') return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------------------
  // navigate — fetch (or reuse the prefetch cache), swap via FX.transition, update history.
  // ---------------------------------------------------------------------------------------
  function updateMetaFrom(newDoc) {
    if (newDoc.title) document.title = newDoc.title;
    ['meta[name="description"]', 'meta[property="og:title"]',
     'meta[property="og:description"]', 'meta[property="og:url"]'].forEach(function (sel) {
      var src = newDoc.querySelector(sel), dst = document.querySelector(sel);
      if (src && dst) dst.setAttribute('content', src.getAttribute('content'));
    });
  }

  async function navigate(rawUrl, opts) {
    opts = opts || {};
    var push = opts.push !== false;
    var parts = splitUrl(rawUrl);
    var key = parts.path;

    var result;
    try {
      result = await fetchPage(key);
    } catch (e) {
      location.href = rawUrl; // hard-nav fallback per CONTRACT
      return;
    }

    var newMain = document.adoptNode(result.main.cloneNode(true));
    newMain.hidden = true;
    var fromMain = currentMain;

    var swap = async function () {
      fromMain.insertAdjacentElement('afterend', newMain);
      markRoles(newMain);
      updateMetaFrom(result.doc);
      if (push) history.pushState({ scrollY: 0 }, '', key + parts.hash);
      fromMain.hidden = true;
      newMain.hidden = false;
      window.scrollTo(0, push ? 0 : (opts.scrollY || 0));
      currentMain = newMain;
      currentPath = key;
      observeLinks(newMain);
      await initPage(newMain, parts.hash);
      if (window.Stats) window.Stats.track(pageIdFor(newMain)); // fire-and-forget, after every successful navigate
    };

    await window.FX.transition(fromMain, newMain, swap);
    if (fromMain && fromMain.parentNode) fromMain.parentNode.removeChild(fromMain);
  }

  // ---------------------------------------------------------------------------------------
  // click interception — same-origin <a href>, no target/download/modifier/middle-click, not
  // a pure same-page hash change, not a non-.html file extension.
  // ---------------------------------------------------------------------------------------
  function onDocumentClick(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !isInternalNavigableLink(a)) return;
    var url = new URL(a.href, location.href);
    if (url.pathname + url.search === currentPath) return; // same-page hash change — not ours
    e.preventDefault();
    navigate(url.pathname + url.search + url.hash, { push: true });
  }

  // "view as .md" toggle, shared across every project page (unchanged from the mockup).
  function onToggleRawClick(e) {
    var t = e.target.closest ? e.target.closest('[data-toggle-raw]') : null;
    if (!t) return;
    e.preventDefault();
    var wrap = t.closest('.page');
    var on = wrap.classList.toggle('show-raw');
    t.textContent = on ? 'view rendered' : 'view as .md';
  }

  // ---------------------------------------------------------------------------------------
  // prefetch — pointerenter/focus/touchstart, plus one IntersectionObserver for in-viewport
  // links. Fetches are cached (see fetchPage); by click time the HTML is already here.
  // ---------------------------------------------------------------------------------------
  function prefetchFromElement(a) {
    if (!isInternalNavigableLink(a)) return;
    var url = new URL(a.href, location.href);
    var key = url.pathname + url.search;
    if (key === currentPath) return;
    fetchPage(key);
  }

  function onPrefetchHintEvent(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a) prefetchFromElement(a);
  }

  var linkObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        prefetchFromElement(entry.target);
        linkObserver.unobserve(entry.target);
      }
    });
  }) : null;

  function observeLinks(root) {
    if (!linkObserver) return;
    root.querySelectorAll('a[href]').forEach(function (a) {
      if (isInternalNavigableLink(a)) linkObserver.observe(a);
    });
  }

  // ---------------------------------------------------------------------------------------
  // back/forward
  // ---------------------------------------------------------------------------------------
  function onPopState(e) {
    var newPath = location.pathname + location.search;
    if (newPath === currentPath) {
      // hash-only change on the current page (photo viewer deep link) — photos.js's concern.
      if (currentMain && currentMain.dataset.page === 'photographs') {
        var id = location.hash.replace(/^#/, '');
        if (id) window.Photos.open(id);
        else window.Photos.close();
      }
      return;
    }
    var scrollY = (e.state && typeof e.state.scrollY === 'number') ? e.state.scrollY : 0;
    navigate(location.pathname + location.search + location.hash, { push: false, scrollY: scrollY });
  }

  // keep the current history entry's scrollY current so the eventual "back" to it is accurate
  // (there is no reliable "about to leave" hook for the browser's own back/forward buttons).
  var scrollSaveTimer = null;
  function onScroll() {
    if (scrollSaveTimer) return;
    scrollSaveTimer = setTimeout(function () {
      scrollSaveTimer = null;
      try { history.replaceState({ scrollY: window.scrollY }, '', location.href); } catch (e) {}
    }, 200);
  }

  // ---------------------------------------------------------------------------------------
  // boot — same sequence as index.html's boot(), past the fx-boot gate.
  // ---------------------------------------------------------------------------------------
  async function boot() {
    try {
      document.fonts.load('400 16px "Red Hat Mono"');
      document.fonts.load('500 16px "Red Hat Mono"');
      document.fonts.load('400 16px "Red Hat Text"');
      await document.fonts.ready;
    } catch (e) {}

    var settingsEl = document.getElementById('fx-settings');
    var settings = settingsEl ? JSON.parse(settingsEl.textContent) : null;
    await window.FX.init(settings);

    var main = document.querySelector('main.page');
    currentMain = main;
    currentPath = location.pathname + location.search;
    markRoles(main);

    try { history.scrollRestoration = 'manual'; } catch (e) {}
    try { history.replaceState({ scrollY: window.scrollY || 0 }, '', location.href); } catch (e) {}

    await initPage(main, location.hash);
    if (window.Stats) window.Stats.track(pageIdFor(main)); // first load

    var warm = false;
    try { warm = !!sessionStorage.getItem('fx-warm'); } catch (e) {}
    if (!warm && !window.FX.lite) {
      var coldDone = window.FX.coldStart(main);
      document.documentElement.classList.remove('fx-boot');
      await coldDone;
    } else {
      window.FX.show(main);
      document.documentElement.classList.remove('fx-boot');
    }

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('click', onToggleRawClick);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerenter', onPrefetchHintEvent, true);
    document.addEventListener('focus', onPrefetchHintEvent, true);
    document.addEventListener('touchstart', onPrefetchHintEvent, { capture: true, passive: true });
    observeLinks(document);
  }

  boot();
})();
