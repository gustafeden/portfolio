(function () {
  'use strict';

  function markRoles(main) {
    var doc = main.ownerDocument;

    Array.prototype.slice
      .call(main.querySelectorAll('p'))
      .forEach(function (p) {
        var kids = Array.prototype.filter.call(p.childNodes, function (n) {
          return n.nodeType !== 3 || n.textContent.trim();
        });
        if (kids.length !== 2) return;
        var img = kids[0],
          em = kids[1];
        if (!img || img.nodeType !== 1 || img.tagName !== 'IMG') return;
        if (!em || em.nodeType !== 1 || em.tagName !== 'EM') return;

        var fig = doc.createElement('figure');
        fig.className = 'side';
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
      h.removeAttribute('id');
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
      if (code) code.removeAttribute('data-lang');
    });

    Array.prototype.slice
      .call(main.querySelectorAll('hr'))
      .forEach(function (hr) {
        var rule = doc.createElement('div');
        rule.className = 'rule';
        rule.setAttribute('data-rule', '');
        hr.replaceWith(rule);
      });

    main.querySelectorAll('article img, .doc img').forEach(function (img) {
      if (!img.hasAttribute('data-i')) img.setAttribute('data-i', '');
    });
  }

  async function insertAtelierFigures(main) {
    var docEl = main.querySelector('[data-doc]');
    if (!docEl || docEl.querySelector('figure')) return;

    var photos = [],
      colls = [];
    try {
      if (window.Photos && window.Photos.ready) await window.Photos.ready;
      photos = (window.Photos && window.Photos.list()) || [];
      colls = (window.Photos && window.Photos.collections()) || [];
    } catch (e) {}
    if (!photos.length) return;

    var collOf = function (p) {
      return colls.find(function (c) {
        return c.id === p.collectionId;
      });
    };
    var night = photos.filter(function (p) {
      var c = collOf(p);
      return c && /mamiya/i.test(c.title || '');
    });
    var withExif = photos.filter(function (p) {
      return p.showExif && p.exif && Object.keys(p.exif).length;
    });
    var wide = night[0] || photos[0];
    var inlinePhoto =
      withExif.find(function (p) {
        return p !== wide;
      }) ||
      photos.find(function (p) {
        return p !== wide;
      }) ||
      photos[1];

    function makeFigure(p, cls, caption) {
      if (!p) return null;
      var fig = document.createElement('figure');
      fig.setAttribute('class', cls || '');
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
    var wideFig = makeFigure(
      wide,
      'side',
      'The Mamiya night set, uploaded from a phone on the way home.'
    );
    if (h2s[1] && wideFig) docEl.insertBefore(wideFig, h2s[1]);
    var inlineFig = makeFigure(
      inlinePhoto,
      'side',
      'A frame from the same pipeline.'
    );
    if (h2s[3] && inlineFig) docEl.insertBefore(inlineFig, h2s[3]);
  }

  async function initPage(main, hash) {
    if (main.dataset.page === 'photographs') {
      await window.Photos.mount(main);
      var id = (hash || '').replace(/^#/, '');
      if (id) window.Photos.open(id);
      else window.Photos.close();
    } else if (main.dataset.page === 'project') {
      if (main.dataset.slug === 'atelier') await insertAtelierFigures(main);
      if (window.Stats) await window.Stats.render(main);
    }
  }

  // These IDs are persisted analytics keys.
  function pageIdFor(main) {
    switch (main.dataset.page) {
      case 'home':
        return 'front';
      case 'project':
        return 'projects_' + main.dataset.slug;
      case 'photographs':
        return 'photos';
      default:
        return main.dataset.page;
    }
  }

  var currentMain = null;
  var currentPath = '';
  var cache = new Map();
  var CACHE_CAP = 20;

  function cacheGet(key) {
    return cache.get(key);
  }
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
    var p = fetch(key, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('fetch failed: ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var main = doc.querySelector('main.page');
        if (!main) throw new Error('no main.page in response for ' + key);
        return { doc: doc, main: main };
      });
    cacheSet(key, p);
    p.catch(function () {
      cache.delete(key);
    });
    return p;
  }

  function splitUrl(raw) {
    var i = raw.indexOf('#');
    return i === -1
      ? { path: raw, hash: '' }
      : { path: raw.slice(0, i), hash: raw.slice(i) };
  }

  function isInternalNavigableLink(a) {
    if (!a || !a.getAttribute('href')) return false;
    if (a.target || a.hasAttribute('download')) return false;
    var url;
    try {
      url = new URL(a.href, location.href);
    } catch (e) {
      return false;
    }
    if (url.origin !== location.origin) return false;
    var lastSeg = url.pathname.split('/').pop();
    if (lastSeg.indexOf('.') !== -1) {
      var ext = lastSeg.split('.').pop().toLowerCase();
      if (ext !== 'html') return false;
    }
    return true;
  }

  function updateMetaFrom(newDoc) {
    if (newDoc.title) document.title = newDoc.title;
    [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]'
    ].forEach(function (sel) {
      var src = newDoc.querySelector(sel),
        dst = document.querySelector(sel);
      if (src && dst) dst.setAttribute('content', src.getAttribute('content'));
    });
  }

  var navigating = false,
    pendingNavigation = null;
  async function navigate(rawUrl, opts) {
    pendingNavigation = { url: rawUrl, opts: opts };
    if (navigating) return;
    navigating = true;
    try {
      while (pendingNavigation) {
        var request = pendingNavigation;
        pendingNavigation = null;
        await navigateOne(request.url, request.opts);
      }
    } finally {
      navigating = false;
    }
  }

  async function navigateOne(rawUrl, opts) {
    opts = opts || {};
    var push = opts.push !== false;
    var parts = splitUrl(rawUrl);
    var key = parts.path;

    var result;
    try {
      result = await fetchPage(key);
    } catch (e) {
      location.href = rawUrl;
      return;
    }
    if (pendingNavigation) return;

    // Closing the viewer releases its scroll lock before the page is replaced.
    if (window.Photos && window.Photos.close) window.Photos.close();
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
      window.scrollTo(0, push ? 0 : opts.scrollY || 0);
      currentMain = newMain;
      currentPath = key;
      observeLinks(newMain);
      await initPage(newMain, parts.hash);
      if (window.Stats) window.Stats.track(pageIdFor(newMain));
    };

    await window.FX.transition(fromMain, newMain, swap);
    if (fromMain && fromMain.parentNode)
      fromMain.parentNode.removeChild(fromMain);
  }

  function onDocumentClick(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !isInternalNavigableLink(a)) return;
    var url = new URL(a.href, location.href);
    if (url.pathname + url.search === currentPath && !navigating) return;
    e.preventDefault();
    navigate(url.pathname + url.search + url.hash, { push: true });
  }

  function onToggleRawClick(e) {
    var t = e.target.closest ? e.target.closest('[data-toggle-raw]') : null;
    if (!t) return;
    e.preventDefault();
    var wrap = t.closest('.page');
    var on = wrap.classList.toggle('show-raw');
    t.textContent = on ? 'view rendered' : 'view as .md';
  }

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

  var linkObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              prefetchFromElement(entry.target);
              linkObserver.unobserve(entry.target);
            }
          });
        })
      : null;

  function observeLinks(root) {
    if (!linkObserver) return;
    root.querySelectorAll('a[href]').forEach(function (a) {
      if (isInternalNavigableLink(a)) linkObserver.observe(a);
    });
  }

  function onPopState(e) {
    var newPath = location.pathname + location.search;
    if (newPath === currentPath) {
      if (currentMain && currentMain.dataset.page === 'photographs') {
        var id = location.hash.replace(/^#/, '');
        if (id) window.Photos.open(id);
        else window.Photos.close();
      }
      return;
    }
    var scrollY =
      e.state && typeof e.state.scrollY === 'number' ? e.state.scrollY : 0;
    navigate(location.pathname + location.search + location.hash, {
      push: false,
      scrollY: scrollY
    });
  }

  var scrollSaveTimer = null;
  function onScroll() {
    if (scrollSaveTimer) return;
    scrollSaveTimer = setTimeout(function () {
      scrollSaveTimer = null;
      try {
        history.replaceState({ scrollY: window.scrollY }, '', location.href);
      } catch (e) {}
    }, 200);
  }

  async function initializeSite() {
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

    try {
      history.scrollRestoration = 'manual';
    } catch (e) {}
    try {
      history.replaceState({ scrollY: window.scrollY || 0 }, '', location.href);
    } catch (e) {}

    await initPage(main, location.hash);
    if (window.Stats) window.Stats.track(pageIdFor(main));

    var revealDone = window.FX.reveal
      ? window.FX.reveal(main)
      : window.FX.show(main);
    await revealDone;

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('click', onToggleRawClick);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerenter', onPrefetchHintEvent, true);
    document.addEventListener('focus', onPrefetchHintEvent, true);
    document.addEventListener('touchstart', onPrefetchHintEvent, {
      capture: true,
      passive: true
    });
    observeLinks(document);
  }

  initializeSite();
})();
