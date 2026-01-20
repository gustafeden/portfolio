// Firebase configuration for portfolio
// Connects to two Firebase projects:
// - atelier-cms: Portfolio photos and collections
// - ourarchive-7d7ba: OurArchive app stats

const atelierConfig = {
  apiKey: "AIzaSyBbvGlBtJ8wPTBiBVLDBLOflEuo8H-BJwA",
  authDomain: "atelier-cms.firebaseapp.com",
  projectId: "atelier-cms",
  storageBucket: "atelier-cms.firebasestorage.app",
};

const ourarchiveConfig = {
  apiKey: "AIzaSyCKH3HNLpncAHpKLmO4MgqMldEgTFsQC-k",
  authDomain: "ourarchive-7d7ba.firebaseapp.com",
  projectId: "ourarchive-7d7ba",
  storageBucket: "ourarchive-7d7ba.firebasestorage.app",
};

// Initialize Firebase
let db = null;  // Atelier DB (portfolio photos)
let ourarchiveDb = null;  // OurArchive DB (stats)
let firebaseReady = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      // Initialize Atelier (default app)
      firebase.initializeApp(atelierConfig);
      db = firebase.firestore();

      // Initialize OurArchive (named app)
      const ourarchiveApp = firebase.initializeApp(ourarchiveConfig, 'ourarchive');
      ourarchiveDb = firebase.firestore(ourarchiveApp);

      firebaseReady = true;
      console.log('Firebase initialized (atelier + ourarchive)');
    }
  } catch (e) {
    console.warn('Firebase init failed, using static data:', e.message);
  }
}

// Load collections from Firestore
async function loadCollectionsFromFirestore() {
  if (!firebaseReady || !db) return null;

  try {
    const collectionsSnap = await db
      .collection('portfolio_collections')
      .where('visible', '==', true)
      .orderBy('order')
      .get();

    if (collectionsSnap.empty) return null;

    const collections = [];

    for (const doc of collectionsSnap.docs) {
      const data = doc.data();

      const photosSnap = await db
        .collection('portfolio_photos')
        .where('collectionId', '==', doc.id)
        .orderBy('order')
        .get();

      const photos = photosSnap.docs.map(p => {
        const pData = p.data();
        return {
          src: pData.src,
          thumbnailSrc: pData.thumbnailSrc || null,
          caption: pData.caption || '',
          location: pData.location || '',
          notes: pData.notes || '',
          showExif: pData.showExif ?? true,
          exif: pData.exif || null,
        };
      });

      // Get displayYear or derive from createdAt
      const createdAt = data.createdAt?.toDate?.() || new Date();
      const displayYear = data.displayYear || createdAt.getFullYear();

      collections.push({
        id: doc.id,
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        cover: data.cover,
        count: photos.length,
        photos,
        displayYear,
        createdAt,
      });
    }

    return collections;
  } catch (e) {
    console.warn('Firestore load failed:', e.message);
    return null;
  }
}

// Load a single collection by ID (works for hidden collections too - for direct links)
async function loadCollectionById(collectionId) {
  if (!firebaseReady || !db) {
    initFirebase();
    if (!firebaseReady || !db) return null;
  }

  try {
    const doc = await db
      .collection('portfolio_collections')
      .doc(collectionId)
      .get();

    if (!doc.exists) return null;

    const data = doc.data();

    // Load photos for this collection
    const photosSnap = await db
      .collection('portfolio_photos')
      .where('collectionId', '==', collectionId)
      .orderBy('order')
      .get();

    const photos = photosSnap.docs.map(p => {
      const pData = p.data();
      return {
        src: pData.src,
        thumbnailSrc: pData.thumbnailSrc || null,
        caption: pData.caption || '',
        location: pData.location || '',
        notes: pData.notes || '',
        showExif: pData.showExif ?? true,
        exif: pData.exif || null,
      };
    });

    const createdAt = data.createdAt?.toDate?.() || new Date();
    const displayYear = data.displayYear || createdAt.getFullYear();

    return {
      id: doc.id,
      title: data.title,
      slug: data.slug,
      description: data.description || '',
      cover: data.cover,
      count: photos.length,
      photos,
      displayYear,
      createdAt,
      visible: data.visible ?? true,
    };
  } catch (e) {
    console.warn('Failed to load collection:', e.message);
    return null;
  }
}

// Export for router
window.loadCollectionById = loadCollectionById;

// Load featured collection setting
async function loadFeaturedSetting() {
  if (!firebaseReady || !db) {
    initFirebase();
    if (!firebaseReady || !db) return null;
  }

  try {
    const doc = await db.collection('portfolio_settings').doc('featured').get();
    if (!doc.exists) return null;

    const data = doc.data();
    const featuredUntil = data.featuredUntil?.toDate?.();

    // Check if featured has expired
    if (featuredUntil && featuredUntil < new Date()) {
      return null; // Expired
    }

    return {
      collectionId: data.collectionId,
      featuredUntil,
    };
  } catch (e) {
    console.warn('Failed to load featured setting:', e.message);
    return null;
  }
}

// Export for router
window.loadFeaturedSetting = loadFeaturedSetting;

// Merge Firestore + static data (Firestore takes priority)
async function loadAllPhotoCollections() {
  initFirebase();

  // Load from Firestore
  const firestoreCollections = await loadCollectionsFromFirestore();

  // Get static data (from data.js)
  const staticCollections = window.photoCollectionsData || [];

  if (firestoreCollections && firestoreCollections.length > 0) {
    // Merge: Firestore first, then static (avoiding duplicates by title)
    const firestoreTitles = new Set(firestoreCollections.map(c => c.title.toLowerCase()));
    const uniqueStatic = staticCollections.filter(
      c => !firestoreTitles.has(c.title.toLowerCase())
    );

    window.photoCollectionsData = [...firestoreCollections, ...uniqueStatic];
    console.log(`Loaded ${firestoreCollections.length} from Firestore, ${uniqueStatic.length} from static`);
  } else if (staticCollections.length > 0) {
    console.log(`Using ${staticCollections.length} static collections`);
  } else {
    console.log('No photo collections found');
    window.photoCollectionsData = [];
  }

  return window.photoCollectionsData;
}

// Export for use in router
window.loadAllPhotoCollections = loadAllPhotoCollections;

// ============ Portfolio Stats for Atelier Project Page ============

// Get live portfolio statistics
async function getPortfolioStats() {
  if (!firebaseReady || !db) {
    initFirebase();
    if (!firebaseReady || !db) return null;
  }

  try {
    // Get all collections (including hidden ones for accurate count)
    const collectionsSnap = await db
      .collection('portfolio_collections')
      .get();

    // Get all photos
    const photosSnap = await db
      .collection('portfolio_photos')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    // Get total photo count
    const allPhotosSnap = await db
      .collection('portfolio_photos')
      .get();

    const latestPhoto = photosSnap.docs.length > 0
      ? photosSnap.docs[0].data()
      : null;

    return {
      collectionCount: collectionsSnap.size,
      photoCount: allPhotosSnap.size,
      latestPhoto: latestPhoto ? {
        src: latestPhoto.src,
        caption: latestPhoto.caption || null,
        location: latestPhoto.location || null,
        createdAt: latestPhoto.createdAt?.toDate() || null,
      } : null,
    };
  } catch (e) {
    console.warn('Failed to load portfolio stats:', e.message);
    return null;
  }
}

// Render stats into the atelier project page
async function renderAtelierStats() {
  const container = document.getElementById('atelier-live-stats');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="stats-loading">
      <span class="text-gray-400">Loading live stats...</span>
    </div>
  `;

  const stats = await getPortfolioStats();

  if (!stats) {
    container.innerHTML = `
      <div class="stats-error text-gray-500 text-sm">
        Unable to load live stats
      </div>
    `;
    return;
  }

  const timeAgo = stats.latestPhoto?.createdAt
    ? formatTimeAgo(stats.latestPhoto.createdAt)
    : 'N/A';

  container.innerHTML = `
    <div class="live-stats bg-shadow-black/50 border border-porcelain-white/10 rounded-lg p-4 my-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span class="text-porcelain-white/60 text-sm uppercase tracking-wider">Live from Firebase</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.collectionCount}</div>
          <div class="text-porcelain-white/60 text-sm">Collections</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.photoCount}</div>
          <div class="text-porcelain-white/60 text-sm">Photos</div>
        </div>
        <div class="stat col-span-2 md:col-span-1">
          <div class="text-lg font-medium text-porcelain-white">${timeAgo}</div>
          <div class="text-porcelain-white/60 text-sm">Latest upload</div>
        </div>
      </div>
      ${stats.latestPhoto ? `
        <div class="mt-4 pt-4 border-t border-porcelain-white/10">
          <div class="text-porcelain-white/60 text-xs uppercase tracking-wider mb-2">Latest Photo</div>
          <div class="flex gap-3 items-center">
            <img src="${stats.latestPhoto.src}" alt="Latest photo"
              class="w-16 h-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
              onclick="window.open('${stats.latestPhoto.src}', '_blank')"
            />
            <div class="flex-1 min-w-0">
              ${stats.latestPhoto.caption
                ? `<div class="text-porcelain-white text-sm truncate">${stats.latestPhoto.caption}</div>`
                : ''}
              ${stats.latestPhoto.location
                ? `<div class="text-porcelain-white/50 text-xs truncate">${stats.latestPhoto.location}</div>`
                : ''}
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Helper to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Export for use in router
window.getPortfolioStats = getPortfolioStats;
window.renderAtelierStats = renderAtelierStats;

// ============ OurArchive Stats ============

// Get OurArchive stats from public_stats collection (written by Cloud Function)
async function getOurArchiveStats() {
  if (!firebaseReady || !ourarchiveDb) {
    initFirebase();
    if (!firebaseReady || !ourarchiveDb) return null;
  }

  try {
    const doc = await ourarchiveDb.collection('public_stats').doc('ourarchive').get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (e) {
    console.warn('Failed to load OurArchive stats:', e.message);
    return null;
  }
}

// Render OurArchive stats into the project page
async function renderOurArchiveStats() {
  const container = document.getElementById('ourarchive-live-stats');
  if (!container) return;

  container.innerHTML = `
    <div class="stats-loading">
      <span class="text-gray-400">Loading live stats...</span>
    </div>
  `;

  const stats = await getOurArchiveStats();

  if (!stats) {
    container.innerHTML = `
      <div class="stats-error text-gray-500 text-sm">
        Unable to load live stats
      </div>
    `;
    return;
  }

  const lastUpdated = stats.lastUpdated?.toDate
    ? formatTimeAgo(stats.lastUpdated.toDate())
    : stats.lastUpdated
      ? formatTimeAgo(new Date(stats.lastUpdated))
      : 'Unknown';

  // Get top item types
  const itemTypes = stats.itemTypes || {};
  const sortedTypes = Object.entries(itemTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  container.innerHTML = `
    <div class="live-stats bg-shadow-black/50 border border-porcelain-white/10 rounded-lg p-4 my-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span class="text-porcelain-white/60 text-sm uppercase tracking-wider">Live from Firebase</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.userCount || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Users</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.householdCount || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Households</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.itemCount || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Items</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.containerCount || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Containers</div>
        </div>
      </div>
      ${sortedTypes.length > 0 ? `
        <div class="mt-4 pt-4 border-t border-porcelain-white/10">
          <div class="text-porcelain-white/60 text-xs uppercase tracking-wider mb-2">Top Item Types</div>
          <div class="flex flex-wrap gap-2">
            ${sortedTypes.map(([type, count]) => `
              <span class="px-2 py-1 bg-stone-gray/20 rounded text-xs text-porcelain-white">
                ${type}: ${count}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="mt-3 text-porcelain-white/40 text-xs">
        Updated ${lastUpdated}
      </div>
    </div>
  `;
}

// Export for use in router
window.getOurArchiveStats = getOurArchiveStats;
window.renderOurArchiveStats = renderOurArchiveStats;

// ============ Bifrost Stats ============

// Get Bifrost platform stats from public_stats collection
async function getBifrostStats() {
  if (!firebaseReady || !db) {
    initFirebase();
    if (!firebaseReady || !db) return null;
  }

  try {
    const doc = await db.collection('public_stats').doc('bifrost').get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (e) {
    console.warn('Failed to load Bifrost stats:', e.message);
    return null;
  }
}

// Render Bifrost stats into the project page
async function renderBifrostStats() {
  const container = document.getElementById('bifrost-live-stats');
  if (!container) return;

  container.innerHTML = `
    <div class="stats-loading">
      <span class="text-gray-400">Loading live stats...</span>
    </div>
  `;

  const stats = await getBifrostStats();

  if (!stats) {
    container.innerHTML = `
      <div class="stats-error text-gray-500 text-sm">
        Unable to load live stats
      </div>
    `;
    return;
  }

  const lastUpdated = stats.lastUpdated?.toDate
    ? formatTimeAgo(stats.lastUpdated.toDate())
    : stats.lastUpdated
      ? formatTimeAgo(new Date(stats.lastUpdated))
      : 'Unknown';

  const lastInvocation = stats.lastInvocationAt?.toDate
    ? formatTimeAgo(stats.lastInvocationAt.toDate())
    : stats.lastInvocationAt
      ? formatTimeAgo(new Date(stats.lastInvocationAt))
      : 'N/A';

  // Agent status indicator
  const agentStatus = stats.agentCount > 0
    ? `<span class="text-green-400">${stats.agentCount} online</span>`
    : `<span class="text-red-400">offline</span>`;

  // Success rate color
  const successRateColor = stats.successRate >= 95
    ? 'text-green-400'
    : stats.successRate >= 80
      ? 'text-yellow-400'
      : 'text-red-400';

  container.innerHTML = `
    <div class="live-stats bg-shadow-black/50 border border-porcelain-white/10 rounded-lg p-4 my-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-block w-2 h-2 ${stats.agentCount > 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full ${stats.agentCount > 0 ? 'animate-pulse' : ''}"></span>
        <span class="text-porcelain-white/60 text-sm uppercase tracking-wider">Live from Bifrost</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.enabledFunctions || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Functions</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.runningServices || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Services</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold text-amber-glow">${stats.activeSchedules || 0}</div>
          <div class="text-porcelain-white/60 text-sm">Schedules</div>
        </div>
        <div class="stat">
          <div class="text-3xl font-bold ${successRateColor}">${stats.successRate || 100}%</div>
          <div class="text-porcelain-white/60 text-sm">Success Rate</div>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-porcelain-white/10">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-porcelain-white/50">Agents:</span>
            <span class="ml-1">${agentStatus}</span>
          </div>
          <div>
            <span class="text-porcelain-white/50">Invocations (24h):</span>
            <span class="ml-1 text-porcelain-white">${stats.invocations24h || 0}</span>
          </div>
          <div>
            <span class="text-porcelain-white/50">Last run:</span>
            <span class="ml-1 text-porcelain-white">${lastInvocation}</span>
          </div>
        </div>
      </div>
      <div class="mt-3 text-porcelain-white/40 text-xs">
        Updated ${lastUpdated}
      </div>
    </div>
  `;
}

// Export for use in router
window.getBifrostStats = getBifrostStats;
window.renderBifrostStats = renderBifrostStats;

// ============ Silent Page View Tracking (Privacy-Focused) ============
// All tracking done via Bifrost functions - no direct Firestore writes
// No persistent visitor IDs stored (GDPR compliant)

// Bifrost configuration
const BIFROST_URL = 'https://europe-west1-atelier-cms.cloudfunctions.net/invokeBifrostAsync';
const BIFROST_API_KEY = 'pk_4623e09a8ce9659991fe8d13501efd37';

// Helper to invoke Bifrost functions (fire and forget)
function invokeBifrost(functionId, payload) {
  fetch(BIFROST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BIFROST_API_KEY,
    },
    body: JSON.stringify({ functionId, payload }),
  }).catch(() => {}); // Fire and forget
}

// Session detection (temporary - only for this browser session)
function isNewSession() {
  const sessionStart = sessionStorage.getItem('portfolio_session_start');
  if (!sessionStart) {
    sessionStorage.setItem('portfolio_session_start', Date.now().toString());
    return true;
  }
  return false;
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getReferrerSource() {
  const ref = document.referrer;
  if (!ref) return 'direct';

  try {
    const url = new URL(ref);
    const host = url.hostname.replace('www.', '');

    // Common referrer mappings
    if (host.includes('google')) return 'Google';
    if (host.includes('bing')) return 'Bing';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('twitter') || host.includes('t.co')) return 'Twitter';
    if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
    if (host.includes('github')) return 'GitHub';
    if (host.includes('reddit')) return 'Reddit';
    if (host === location.hostname) return 'internal';

    return host;
  } catch {
    return 'unknown';
  }
}

// Get geolocation from IP (client-side, cached in session)
async function getGeoLocation() {
  // Check session cache first
  const cached = sessionStorage.getItem('portfolio_geo');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Invalid cache, continue to fetch
    }
  }

  try {
    // Use ip-api.com for free geolocation (no API key needed)
    const response = await fetch('http://ip-api.com/json/?fields=status,country,city');
    const data = await response.json();

    if (data.status === 'success') {
      const geo = {
        country: data.country || 'Unknown',
        city: data.city || null,
      };
      // Cache for this session
      sessionStorage.setItem('portfolio_geo', JSON.stringify(geo));
      return geo;
    }
  } catch (e) {
    console.debug('Geo lookup failed:', e.message);
  }

  return { country: 'Unknown', city: null };
}

// Track a page view - via Bifrost function
async function trackPageView(pageId) {
  try {
    // Track page view
    invokeBifrost('track-page-view', { page: pageId });

    // Track session data (only on new session)
    if (isNewSession()) {
      const device = getDeviceType();
      const referrer = getReferrerSource();

      // Get geolocation (async but we don't wait for page view)
      getGeoLocation().then(geo => {
        // Send to Bifrost for aggregation
        // No visitor IDs, no personal data - just aggregated counts
        invokeBifrost('track-visit', {
          device,
          referrer,
          country: geo.country,
          city: geo.city,
        });
      }).catch(() => {});
    }
  } catch (e) {
    console.debug('Page view tracking failed:', e.message);
  }
}

// Export for router
window.trackPageView = trackPageView;

// Track a photo view (when opened in lightbox) - via Bifrost function
async function trackPhotoView(photoSrc, collectionTitle) {
  try {
    invokeBifrost('track-photo-view', {
      photoSrc,
      collection: collectionTitle || 'unknown',
    });
  } catch (e) {
    console.debug('Photo view tracking failed:', e.message);
  }
}

// Export for router
window.trackPhotoView = trackPhotoView;

// ============ Stats History & Sparklines ============

// Get stats history for sparkline (last 30 days)
async function getStatsHistory(source, database) {
  if (!firebaseReady) {
    initFirebase();
    if (!firebaseReady) return [];
  }

  const targetDb = database || db;
  if (!targetDb) return [];

  try {
    const historySnap = await targetDb
      .collection('public_stats')
      .doc(source)
      .collection('history')
      .orderBy('date', 'desc')
      .limit(30)
      .get();

    return historySnap.docs.map(doc => ({
      date: doc.id,
      ...doc.data(),
    })).reverse(); // Oldest first for sparkline
  } catch (e) {
    console.warn('Failed to load stats history:', e.message);
    return [];
  }
}

// Render an SVG sparkline from data points
function renderSparkline(values, { width = 80, height = 24, color = '#D9A441' } = {}) {
  if (!values || values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  // Calculate trend
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trend = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'flat';
  const trendPercent = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;

  return {
    svg: `<svg width="${width}" height="${height}" class="inline-block ml-2">
      <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${points}" />
    </svg>`,
    trend,
    trendPercent,
  };
}

// Export for use
window.getStatsHistory = getStatsHistory;
window.renderSparkline = renderSparkline;
