// stats.js — live stats boxes (Atelier/Bifrost/OurArchive project pages) + silent page-view
// tracking. Ported from the old SPA's assets/js/firebase-config.js (renderAtelierStats
// ~line 278, renderOurArchiveStats ~line 386, renderBifrostStats ~line 486, trackPageView
// ~line 681) — same Firestore projects/collections and the same Bifrost tracking endpoint,
// no Firebase SDK (plain Firestore REST, like static/photos.js), restyled to the house ledger
// look instead of the old Tailwind cards. See CONTRACT.md.
//
// Exposes window.Stats = { render(mainEl), track(pageId) }.
(function () {
  'use strict';

  // ---------- Firestore REST (same two projects as photos.js / the old firebase-config.js) ----------
  var ATELIER_KEY = 'AIzaSyBbvGlBtJ8wPTBiBVLDBLOflEuo8H-BJwA';
  var ATELIER_FS = 'https://firestore.googleapis.com/v1/projects/atelier-cms/databases/(default)/documents/';
  var OURARCHIVE_KEY = 'AIzaSyCKH3HNLpncAHpKLmO4MgqMldEgTFsQC-k';
  var OURARCHIVE_FS = 'https://firestore.googleapis.com/v1/projects/ourarchive-7d7ba/databases/(default)/documents/';

  function val(v) {
    if (!v) return undefined;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) {
      var o = {}, f = v.mapValue.fields || {};
      for (var k in f) o[k] = val(f[k]);
      return o;
    }
  }
  function fieldsOf(doc) {
    var o = {};
    for (var k in (doc.fields || {})) o[k] = val(doc.fields[k]);
    return o;
  }

  // count a collection by paginating the List Documents endpoint (mirrors photos.js's listColl)
  async function countColl(base, key, coll) {
    var n = 0, tok = '';
    do {
      var r = await fetch(base + coll + '?pageSize=300&key=' + key + (tok ? '&pageToken=' + tok : ''));
      if (!r.ok) throw new Error('firestore ' + r.status);
      var j = await r.json();
      n += (j.documents || []).length;
      tok = j.nextPageToken || '';
    } while (tok);
    return n;
  }

  async function latestDoc(base, key, coll, orderField) {
    var r = await fetch(base + coll + '?pageSize=1&orderBy=' + encodeURIComponent(orderField + ' desc') + '&key=' + key);
    if (!r.ok) throw new Error('firestore ' + r.status);
    var j = await r.json();
    var d = (j.documents || [])[0];
    return d ? fieldsOf(d) : null;
  }

  async function getDoc(base, key, path) {
    var r = await fetch(base + path + '?key=' + key);
    if (!r.ok) return null; // 404 (doc doesn't exist) or any other failure — slot stays empty
    var j = await r.json();
    if (!j.fields) return null;
    return fieldsOf(j);
  }

  function timeAgo(iso) {
    if (!iso) return null;
    var then = new Date(iso).getTime();
    if (isNaN(then)) return null;
    var diff = Date.now() - then;
    var minutes = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days < 7) return days + 'd ago';
    return new Date(then).toLocaleDateString();
  }

  // ---------- markup: a ledger-style <dl>, never a card ----------
  function rowsHtml(rows) {
    return rows.filter(function (r) { return r != null; }).map(function (r) {
      return '<dt>' + r[0] + '</dt><dd data-t data-role="body">' + r[1] + '</dd>';
    }).join('');
  }
  function liveHeadHtml(label, on) {
    return '<div class="ls-head"><span class="ls-dot' + (on ? ' on' : '') + '"></span>' + label + '</div>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function setEmpty(el) { el.innerHTML = ''; } // failure (offline/blocked) → leave the slot empty, no errors thrown

  async function renderAtelier(el) {
    var collectionCount = await countColl(ATELIER_FS, ATELIER_KEY, 'portfolio_collections');
    var photoCount = await countColl(ATELIER_FS, ATELIER_KEY, 'portfolio_photos');
    var latest = await latestDoc(ATELIER_FS, ATELIER_KEY, 'portfolio_photos', 'createdAt');
    el.innerHTML = '<div class="live-stats">' + liveHeadHtml('live from firestore', true) + '<dl>' +
      rowsHtml([
        ['collections', collectionCount],
        ['photos', photoCount],
        latest ? ['latest upload', esc(timeAgo(latest.createdAt) || 'n/a')] : null,
        latest && latest.caption ? ['caption', esc(latest.caption)] : null,
      ]) + '</dl></div>';
  }

  async function renderOurArchive(el) {
    var stats = await getDoc(OURARCHIVE_FS, OURARCHIVE_KEY, 'public_stats/ourarchive');
    if (!stats) { setEmpty(el); return; }
    var types = Object.entries(stats.itemTypes || {}).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
    el.innerHTML = '<div class="live-stats">' + liveHeadHtml('live from firestore', true) + '<dl>' +
      rowsHtml([
        ['users', stats.userCount || 0],
        ['households', stats.householdCount || 0],
        ['items', stats.itemCount || 0],
        ['containers', stats.containerCount || 0],
        types.length ? ['top types', esc(types.map(function (t) { return t[0] + ' ' + t[1]; }).join(', '))] : null,
        ['updated', esc(timeAgo(stats.lastUpdated) || 'unknown')],
      ]) + '</dl></div>';
  }

  async function renderBifrost(el) {
    var stats = await getDoc(ATELIER_FS, ATELIER_KEY, 'public_stats/bifrost');
    if (!stats) { setEmpty(el); return; }
    var online = (stats.agentCount || 0) > 0;
    el.innerHTML = '<div class="live-stats">' + liveHeadHtml('live from bifrost', online) + '<dl>' +
      rowsHtml([
        ['functions', stats.enabledFunctions || 0],
        ['services', stats.runningServices || 0],
        ['schedules', stats.activeSchedules || 0],
        ['success rate', (stats.successRate != null ? stats.successRate : 100) + '%'],
        ['agents', online ? (stats.agentCount + ' online') : 'offline'],
        ['invocations (24h)', stats.invocations24h || 0],
        ['last run', esc(timeAgo(stats.lastInvocationAt) || 'n/a')],
        ['updated', esc(timeAgo(stats.lastUpdated) || 'unknown')],
      ]) + '</dl></div>';
  }

  var SLOTS = [
    { id: 'atelier-live-stats', fn: renderAtelier },
    { id: 'bifrost-live-stats', fn: renderBifrost },
    { id: 'ourarchive-live-stats', fn: renderOurArchive },
  ];

  // fills any live-stats slots present in mainEl; a project page carries at most one.
  async function render(mainEl) {
    var any = false;
    for (var i = 0; i < SLOTS.length; i++) {
      var el = mainEl.querySelector('#' + SLOTS[i].id);
      if (!el) continue;
      any = true;
      try { await SLOTS[i].fn(el); } catch (e) { setEmpty(el); } // offline/blocked → empty slot, no thrown error
    }
    if (any && window.FX && window.FX.refresh) window.FX.refresh(mainEl);
  }

  // ---------- silent page-view tracking (same Bifrost backend + payload as the old site) ----------
  var BIFROST_URL = 'https://europe-west1-atelier-cms.cloudfunctions.net/invokeBifrostAsync';
  var BIFROST_API_KEY = 'pk_4623e09a8ce9659991fe8d13501efd37';

  function invokeBifrost(functionId, payload) {
    fetch(BIFROST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': BIFROST_API_KEY },
      body: JSON.stringify({ functionId: functionId, payload: payload }),
    }).catch(function () {}); // fire and forget
  }

  function isNewSession() {
    try {
      if (!sessionStorage.getItem('portfolio_session_start')) {
        sessionStorage.setItem('portfolio_session_start', Date.now().toString());
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getReferrerSource() {
    var ref = document.referrer;
    if (!ref) return 'direct';
    try {
      var url = new URL(ref), host = url.hostname.replace('www.', '');
      if (host.includes('google')) return 'Google';
      if (host.includes('bing')) return 'Bing';
      if (host.includes('linkedin')) return 'LinkedIn';
      if (host.includes('twitter') || host.includes('t.co')) return 'Twitter';
      if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
      if (host.includes('github')) return 'GitHub';
      if (host.includes('reddit')) return 'Reddit';
      if (host === location.hostname) return 'internal';
      return host;
    } catch (e) { return 'unknown'; }
  }

  async function getGeoLocation() {
    try {
      var cached = sessionStorage.getItem('portfolio_geo');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    try {
      var r = await fetch('http://ip-api.com/json/?fields=status,country,city');
      var data = await r.json();
      if (data.status === 'success') {
        var geo = { country: data.country || 'Unknown', city: data.city || null };
        try { sessionStorage.setItem('portfolio_geo', JSON.stringify(geo)); } catch (e) {}
        return geo;
      }
    } catch (e) {}
    return { country: 'Unknown', city: null };
  }

  function track(pageId) {
    try {
      invokeBifrost('track-page-view', { page: pageId });
      if (isNewSession()) {
        var device = getDeviceType(), referrer = getReferrerSource();
        getGeoLocation().then(function (geo) {
          invokeBifrost('track-visit', { device: device, referrer: referrer, country: geo.country, city: geo.city });
        }).catch(function () {});
      }
    } catch (e) {} // never block navigation on a tracking failure
  }

  window.Stats = { render: render, track: track };
})();
