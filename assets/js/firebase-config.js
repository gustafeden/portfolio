// Firebase configuration for portfolio
// Loads photo collections from Firestore with fallback to static data.js

const firebaseConfig = {
  apiKey: "AIzaSyBbvGlBtJ8wPTBiBVLDBLOflEuo8H-BJwA",
  authDomain: "atelier-cms.firebaseapp.com",
  projectId: "atelier-cms",
  storageBucket: "atelier-cms.firebasestorage.app",
};

// Initialize Firebase
let db = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      firebaseReady = true;
      console.log('Firebase initialized');
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
          caption: pData.caption || '',
          location: pData.location || '',
          notes: pData.notes || '',
          showExif: pData.showExif ?? true,
          exif: pData.exif || null,
        };
      });

      collections.push({
        id: doc.id,
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        cover: data.cover,
        count: photos.length,
        photos,
      });
    }

    return collections;
  } catch (e) {
    console.warn('Firestore load failed:', e.message);
    return null;
  }
}

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
