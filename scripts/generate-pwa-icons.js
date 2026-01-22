const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_ICON = path.join(__dirname, '../frontend/public/logo.png'); // Assuming a base logo exists
const OUTPUT_DIR = path.join(__dirname, '../frontend/public');

const SIZES = [192, 512];

async function generateIcons() {
  if (!fs.existsSync(SOURCE_ICON)) {
    console.warn(`⚠️ Source icon not found at ${SOURCE_ICON}. Skipping icon generation.`);
    console.warn('   Please place a 512x512 PNG logo at frontend/public/logo.png to generate PWA icons.');

    // Create a placeholder if it doesn't exist, just to prevent build errors if referenced
    // In a real scenario, we'd want the actual logo.
    return;
  }

  console.log('🎨 Generating PWA icons...');

  for (const size of SIZES) {
    const fileName = `pwa-${size}x${size}.png`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    try {
      await sharp(SOURCE_ICON)
        .resize(size, size)
        .toFile(outputPath);
      console.log(`   ✅ Generated ${fileName}`);
    } catch (error) {
      console.error(`   ❌ Failed to generate ${fileName}:`, error);
    }
  }

  // Generate favicon.ico if not exists (basic resize to 64x64 for ico)
  const faviconPath = path.join(OUTPUT_DIR, 'favicon.ico');
  if (!fs.existsSync(faviconPath)) {
      try {
          await sharp(SOURCE_ICON)
            .resize(64, 64)
            .toFile(faviconPath);
          console.log(`   ✅ Generated favicon.ico`);
      } catch (error) {
          console.error(`   ❌ Failed to generate favicon.ico:`, error);
      }
  }

  // Generate apple-touch-icon
  const appleIconPath = path.join(OUTPUT_DIR, 'apple-touch-icon.png');
  try {
      await sharp(SOURCE_ICON).resize(180, 180).toFile(appleIconPath);
      console.log(`   ✅ Generated apple-touch-icon.png`);
  } catch (e) {}

}

generateIcons();
