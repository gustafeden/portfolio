// Firebase configuration for portfolio
// Loads photo collections from Firestore with fallback to static data.js

const firebaseConfig = {
  apiKey: "AIzaSyCKH3HNLpncAHpKLmO4MgqMldEgTFsQC-k",
  authDomain: "ourarchive-7d7ba.firebaseapp.com",
  projectId: "ourarchive-7d7ba",
  storageBucket: "ourarchive-7d7ba.firebasestorage.app",
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
