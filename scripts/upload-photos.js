#!/usr/bin/env node
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const os = require('os');

// Config
const BUCKET_NAME = 'ourarchive-7d7ba.firebasestorage.app';
const PHOTOS_DIR = path.join(__dirname, '..', 'photos-to-upload');
const DATA_FILE = path.join(__dirname, '..', 'assets', 'js', 'data.js');
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

// Image settings
const IMAGE_MAX_WIDTH = 2000;   // Max width for full images
const IMAGE_QUALITY = 85;       // JPEG quality (80-90 is good for web)
const THUMB_WIDTH = 600;        // Thumbnail width for covers/grid
const THUMB_QUALITY = 80;

// Check for service account
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\nMissing service-account.json!');
  console.error('\nTo set up:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save as: scripts/service-account.json');
  console.error('\nMake sure this file is in .gitignore!\n');
  process.exit(1);
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(require(SERVICE_ACCOUNT_PATH)),
  storageBucket: BUCKET_NAME,
});
const bucket = getStorage().bucket();

// Image extensions to process
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

async function optimizeImage(inputPath, maxWidth, quality) {
  const tempPath = path.join(os.tmpdir(), `opt-${Date.now()}-${path.basename(inputPath)}`);

  await sharp(inputPath)
    .rotate()  // Auto-rotate based on EXIF orientation
    .resize(maxWidth, null, {
      withoutEnlargement: true,  // Don't upscale small images
      fit: 'inside',
    })
    .jpeg({ quality, mozjpeg: true })
    .toFile(tempPath);

  return tempPath;
}

async function extractExif(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const exif = metadata.exif ? require('exif-reader')(metadata.exif) : null;

    if (!exif) return null;

    const result = {};

    // Camera & lens
    if (exif.Image?.Make) result.camera = `${exif.Image.Make} ${exif.Image.Model || ''}`.trim();
    if (exif.Photo?.LensModel) result.lens = exif.Photo.LensModel;

    // Exposure settings
    if (exif.Photo?.FNumber) result.aperture = `f/${exif.Photo.FNumber}`;
    if (exif.Photo?.ExposureTime) {
      const t = exif.Photo.ExposureTime;
      result.shutter = t >= 1 ? `${t}s` : `1/${Math.round(1/t)}s`;
    }
    if (exif.Photo?.ISOSpeedRatings) result.iso = exif.Photo.ISOSpeedRatings;
    if (exif.Photo?.FocalLength) result.focalLength = `${exif.Photo.FocalLength}mm`;

    // Date
    if (exif.Photo?.DateTimeOriginal) {
      result.date = exif.Photo.DateTimeOriginal.toISOString().split('T')[0];
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (e) {
    return null;
  }
}

async function uploadFile(localPath, remotePath) {
  await bucket.upload(localPath, {
    destination: remotePath,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  // Make file public and get URL
  const file = bucket.file(remotePath);
  await file.makePublic();
  return `https://storage.googleapis.com/${BUCKET_NAME}/${remotePath}`;
}

async function processCollection(collectionDir) {
  const collectionName = path.basename(collectionDir);
  console.log(`\nProcessing collection: ${collectionName}`);

  const files = fs.readdirSync(collectionDir)
    .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log('  No images found, skipping.');
    return null;
  }

  const photos = [];
  let coverUrl = null;
  const tempFiles = []; // Track temp files for cleanup

  for (const file of files) {
    const localPath = path.join(collectionDir, file);
    const baseName = path.basename(file, path.extname(file));
    const remoteName = `${baseName}.jpg`; // Always output as jpg
    const remotePath = `portfolio/photos/${collectionName}/${remoteName}`;

    // Get original size for logging
    const originalSize = fs.statSync(localPath).size;

    // Optimize the image
    console.log(`  Optimizing: ${file}`);
    const optimizedPath = await optimizeImage(localPath, IMAGE_MAX_WIDTH, IMAGE_QUALITY);
    tempFiles.push(optimizedPath);

    const newSize = fs.statSync(optimizedPath).size;
    const savings = Math.round((1 - newSize / originalSize) * 100);
    console.log(`    ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(newSize / 1024 / 1024).toFixed(1)}MB (${savings}% smaller)`);

    // Upload optimized image
    console.log(`  Uploading: ${remoteName}`);
    const url = await uploadFile(optimizedPath, remotePath);

    // First image becomes the cover (upload thumbnail version too)
    if (!coverUrl) {
      const thumbPath = await optimizeImage(localPath, THUMB_WIDTH, THUMB_QUALITY);
      tempFiles.push(thumbPath);
      const thumbRemotePath = `portfolio/photos/${collectionName}/_cover.jpg`;
      coverUrl = await uploadFile(thumbPath, thumbRemotePath);
      console.log(`  Created cover thumbnail`);
    }

    // Extract EXIF data
    const exif = await extractExif(localPath);

    // Use filename without extension as caption (can be edited later)
    const caption = baseName
      .replace(/[-_]/g, ' ')
      .replace(/^\d+\s*/, ''); // Remove leading numbers

    const photoData = {
      src: url,
      caption: caption || '',
      showExif: true,  // Toggle this to show/hide EXIF in lightbox
    };
    if (exif) photoData.exif = exif;

    photos.push(photoData);
  }

  // Cleanup temp files
  for (const tmp of tempFiles) {
    try { fs.unlinkSync(tmp); } catch (e) {}
  }

  return {
    title: collectionName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    cover: coverUrl,
    count: photos.length,
    photos,
  };
}

async function main() {
  console.log('Firebase Photo Uploader');
  console.log('=======================');

  // Check photos directory
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    console.log('\nCreated photos-to-upload/ directory.');
    console.log('Add folders with images and run again.');
    console.log('\nExample structure:');
    console.log('  photos-to-upload/');
    console.log('    street/');
    console.log('      01-city-lights.jpg');
    console.log('      02-rainy-day.jpg');
    console.log('    nature/');
    console.log('      forest.jpg');
    return;
  }

  // Get collection directories
  const collections = fs.readdirSync(PHOTOS_DIR)
    .filter(f => fs.statSync(path.join(PHOTOS_DIR, f)).isDirectory());

  if (collections.length === 0) {
    console.log('\nNo collections found in photos-to-upload/');
    console.log('Create subdirectories with images to upload.');
    return;
  }

  // Load existing data
  let existingData = [];
  if (fs.existsSync(DATA_FILE)) {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    const match = content.match(/window\.photoCollectionsData\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      try {
        existingData = eval(match[1]); // Safe since we control the file
      } catch (e) {
        console.log('Could not parse existing data, starting fresh.');
      }
    }
  }

  // Find next ID
  let nextId = existingData.length > 0
    ? Math.max(...existingData.map(c => c.id)) + 1
    : 1;

  // Process each collection
  const newCollections = [];
  for (const collectionDir of collections) {
    const fullPath = path.join(PHOTOS_DIR, collectionDir);
    const result = await processCollection(fullPath);
    if (result) {
      result.id = nextId++;
      newCollections.push(result);
    }
  }

  if (newCollections.length === 0) {
    console.log('\nNo new photos to upload.');
    return;
  }

  // Merge with existing (replace if same title exists)
  const mergedData = [...existingData];
  for (const newColl of newCollections) {
    const existingIndex = mergedData.findIndex(
      c => c.title.toLowerCase() === newColl.title.toLowerCase()
    );
    if (existingIndex >= 0) {
      newColl.id = mergedData[existingIndex].id;
      mergedData[existingIndex] = newColl;
      console.log(`\nUpdated existing collection: ${newColl.title}`);
    } else {
      mergedData.push(newColl);
      console.log(`\nAdded new collection: ${newColl.title}`);
    }
  }

  // Generate data.js content
  const dataContent = `// Photo collections data
// Generated by upload-photos.js - ${new Date().toISOString().split('T')[0]}
// Images stored in Firebase Storage: ${BUCKET_NAME}

window.photoCollectionsData = ${JSON.stringify(mergedData, null, 2)};
`;

  fs.writeFileSync(DATA_FILE, dataContent);
  console.log(`\nUpdated: assets/js/data.js`);
  console.log(`Total collections: ${mergedData.length}`);

  // Cleanup option
  console.log('\n---');
  console.log('Upload complete! You can now delete photos-to-upload/ contents.');
  console.log('Or keep them as backup.\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
