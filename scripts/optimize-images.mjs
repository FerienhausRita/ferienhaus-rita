#!/usr/bin/env node
/**
 * Image optimization script
 * Compresses all JPG images in public/images/ using sharp
 * Keeps originals backed up in public/images-backup/
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

const IMAGE_DIR = "public/images";
const BACKUP_DIR = "public/images-backup";

// Quality settings per category
const QUALITY_MAP = {
  hero: { quality: 75, maxWidth: 1920 },       // Hero images: big but compressed
  region: { quality: 75, maxWidth: 1600 },      // Region images
  about: { quality: 75, maxWidth: 1200 },       // About page
  apartments: { quality: 75, maxWidth: 1600 },  // Apartment photos
};

function getSettings(filePath) {
  if (filePath.includes("/hero/")) return QUALITY_MAP.hero;
  if (filePath.includes("/region/")) return QUALITY_MAP.region;
  if (filePath.includes("/about/")) return QUALITY_MAP.about;
  return QUALITY_MAP.apartments;
}

function getAllImages(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllImages(fullPath));
    } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function optimizeImage(filePath) {
  const settings = getSettings(filePath);
  const originalSize = fs.statSync(filePath).size;

  // Create backup path
  const backupPath = filePath.replace(IMAGE_DIR, BACKUP_DIR);
  const backupDir = path.dirname(backupPath);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, backupPath);

  // Get image metadata
  const metadata = await sharp(filePath).metadata();

  let pipeline = sharp(filePath);

  // Resize if wider than maxWidth
  if (metadata.width && metadata.width > settings.maxWidth) {
    pipeline = pipeline.resize(settings.maxWidth, null, {
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  // Compress as JPEG
  const buffer = await pipeline
    .jpeg({ quality: settings.quality, mozjpeg: true })
    .toBuffer();

  fs.writeFileSync(filePath, buffer);
  const newSize = buffer.length;

  const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
  console.log(
    `  ${filePath}: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (${savings}% smaller)`
  );

  return { original: originalSize, optimized: newSize };
}

async function main() {
  console.log("🖼️  Optimizing images...\n");

  const images = getAllImages(IMAGE_DIR);
  console.log(`Found ${images.length} images to optimize.\n`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const img of images) {
    try {
      const result = await optimizeImage(img);
      totalOriginal += result.original;
      totalOptimized += result.optimized;
    } catch (err) {
      console.error(`  ❌ Error optimizing ${img}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(
    `   Total: ${(totalOriginal / 1024 / 1024).toFixed(1)}MB → ${(totalOptimized / 1024 / 1024).toFixed(1)}MB`
  );
  console.log(
    `   Saved: ${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(1)}MB (${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%)`
  );
  console.log(`\n   Originals backed up to ${BACKUP_DIR}/`);
}

main().catch(console.error);
