/**
 * PWA Icon Generator Script
 * Generates required PWA icons from a base SVG or color
 * 
 * Usage: node generate-pwa-icons.js
 * 
 * Generates:
 * - pwa-192x192.png
 * - pwa-512x512.png
 * - pwa-maskable-192x192.png
 * - pwa-maskable-512x512.png
 * - apple-touch-icon.png (180x180)
 * - favicon.png (64x64)
 * - screenshot-540x720.png (mobile)
 * - screenshot-1280x720.png (desktop)
 */

const fs = require('fs');
const path = require('path');

// Install sharp if needed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  try {
    sharp = require('../frontend/node_modules/sharp');
  } catch (e2) {
    console.error('❌ sharp is required: npm install sharp');
    process.exit(1);
  }
}

const publicDir = path.join(__dirname, '..', 'frontend', 'public');

// SVG logo (base64 encoded or use file)
const SVG_LOGO = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="#4F46E5"/>
  
  <!-- Stylized graduation cap -->
  <g transform="translate(256, 256)">
    <!-- Cap square -->
    <rect x="-80" y="-40" width="160" height="80" fill="white" opacity="0.9" rx="8"/>
    
    <!-- Tassel line -->
    <line x1="0" y1="40" x2="0" y2="100" stroke="white" stroke-width="6" opacity="0.8"/>
    
    <!-- Tassel ball -->
    <circle cx="0" cy="110" r="15" fill="white" opacity="0.8"/>
    
    <!-- Text: SMS -->
    <text x="0" y="10" font-size="32" font-weight="bold" fill="#4F46E5" 
          text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif">
      SMS
    </text>
  </g>
</svg>
`;

async function generateIcon(size, isMaskable = false) {
  const suffix = isMaskable ? `-maskable-${size}x${size}` : `-${size}x${size}`;
  const filename = path.join(publicDir, `pwa${suffix}.png`);

  const svg = Buffer.from(SVG_LOGO);

  const options = {
    width: size,
    height: size,
    fit: 'contain',
    background: isMaskable ? { r: 255, g: 255, b: 255, alpha: 0 } : { r: 79, g: 70, b: 229, alpha: 1 },
  };

  if (isMaskable) {
    // Maskable icons should have padding for safe zone
    options.background = { r: 255, g: 255, b: 255, alpha: 0 };
  }

  try {
    await sharp(svg)
      .resize(size, size, options)
      .png()
      .toFile(filename);

    console.log(`✅ Generated: ${path.basename(filename)}`);
  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
  }
}

async function generateAppleTouchIcon() {
  const filename = path.join(publicDir, 'apple-touch-icon.png');
  const svg = Buffer.from(SVG_LOGO);

  try {
    await sharp(svg)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 79, g: 70, b: 229, alpha: 1 },
      })
      .png()
      .toFile(filename);

    console.log(`✅ Generated: apple-touch-icon.png`);
  } catch (error) {
    console.error(`❌ Error generating apple-touch-icon.png:`, error.message);
  }
}

async function generateFavicon() {
  const filename = path.join(publicDir, 'favicon.png');
  const svg = Buffer.from(SVG_LOGO);

  try {
    await sharp(svg)
      .resize(64, 64, {
        fit: 'contain',
        background: { r: 79, g: 70, b: 229, alpha: 1 },
      })
      .png()
      .toFile(filename);

    console.log(`✅ Generated: favicon.png`);
  } catch (error) {
    console.error(`❌ Error generating favicon.png:`, error.message);
  }
}

async function generateScreenshots() {
  // Mobile screenshot (540x720)
  const mobileSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 720">
      <!-- Background -->
      <rect width="540" height="720" fill="#f3f4f6"/>
      
      <!-- Header -->
      <rect width="540" height="80" fill="#4F46E5"/>
      <text x="270" y="50" font-size="28" font-weight="bold" fill="white" 
            text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif">
        SMS App
      </text>
      
      <!-- Logo -->
      <circle cx="270" cy="200" r="60" fill="#4F46E5"/>
      <text x="270" y="205" font-size="36" font-weight="bold" fill="white" 
            text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif">
        SMS
      </text>
      
      <!-- Content -->
      <rect x="20" y="300" width="500" height="60" fill="white" rx="8" stroke="#e5e7eb" stroke-width="2"/>
      <text x="40" y="335" font-size="18" fill="#111827" font-family="Arial, sans-serif">Dashboard</text>
      
      <rect x="20" y="380" width="500" height="60" fill="white" rx="8" stroke="#e5e7eb" stroke-width="2"/>
      <text x="40" y="415" font-size="18" fill="#111827" font-family="Arial, sans-serif">Students</text>
      
      <rect x="20" y="460" width="500" height="60" fill="white" rx="8" stroke="#e5e7eb" stroke-width="2"/>
      <text x="40" y="495" font-size="18" fill="#111827" font-family="Arial, sans-serif">Attendance</text>
      
      <rect x="20" y="540" width="500" height="60" fill="white" rx="8" stroke="#e5e7eb" stroke-width="2"/>
      <text x="40" y="575" font-size="18" fill="#111827" font-family="Arial, sans-serif">Grades</text>
    </svg>
  `);

  try {
    await sharp(mobileSvg)
      .resize(540, 720, { fit: 'fill' })
      .png()
      .toFile(path.join(publicDir, 'screenshot-540x720.png'));

    console.log(`✅ Generated: screenshot-540x720.png (mobile)`);
  } catch (error) {
    console.error(`❌ Error generating mobile screenshot:`, error.message);
  }

  // Desktop screenshot (1280x720)
  const desktopSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <!-- Background -->
      <rect width="1280" height="720" fill="#f3f4f6"/>
      
      <!-- Sidebar -->
      <rect width="200" height="720" fill="#4F46E5"/>
      <circle cx="100" cy="60" r="30" fill="white" opacity="0.9"/>
      <text x="100" y="140" font-size="16" font-weight="bold" fill="white" 
            text-anchor="middle" font-family="Arial, sans-serif">SMS</text>
      
      <!-- Menu items -->
      <rect x="10" y="180" width="180" height="40" fill="white" opacity="0.2" rx="4"/>
      <text x="20" y="205" font-size="14" fill="white" font-family="Arial, sans-serif">Dashboard</text>
      
      <rect x="10" y="230" width="180" height="40" fill="white" opacity="0.2" rx="4"/>
      <text x="20" y="255" font-size="14" fill="white" font-family="Arial, sans-serif">Students</text>
      
      <rect x="10" y="280" width="180" height="40" fill="white" opacity="0.2" rx="4"/>
      <text x="20" y="305" font-size="14" fill="white" font-family="Arial, sans-serif">Attendance</text>
      
      <!-- Main content -->
      <rect x="220" y="20" width="1040" height="680" fill="white" rx="8"/>
      
      <!-- Header -->
      <rect x="220" y="20" width="1040" height="70" fill="#f3f4f6" rx="8" stroke="#e5e7eb" stroke-width="1"/>
      <text x="240" y="60" font-size="24" font-weight="bold" fill="#111827" font-family="Arial, sans-serif">
        Welcome to Student Management System
      </text>
      
      <!-- Cards -->
      <rect x="240" y="120" width="300" height="140" fill="#4F46E5" opacity="0.1" rx="8" stroke="#4F46E5" stroke-width="2"/>
      <text x="260" y="145" font-size="16" font-weight="bold" fill="#111827" font-family="Arial, sans-serif">Total Students</text>
      <text x="260" y="180" font-size="32" font-weight="bold" fill="#4F46E5" font-family="Arial, sans-serif">245</text>
      
      <rect x="570" y="120" width="300" height="140" fill="#10b981" opacity="0.1" rx="8" stroke="#10b981" stroke-width="2"/>
      <text x="590" y="145" font-size="16" font-weight="bold" fill="#111827" font-family="Arial, sans-serif">Attendance</text>
      <text x="590" y="180" font-size="32" font-weight="bold" fill="#10b981" font-family="Arial, sans-serif">94%</text>
      
      <rect x="900" y="120" width="300" height="140" fill="#f59e0b" opacity="0.1" rx="8" stroke="#f59e0b" stroke-width="2"/>
      <text x="920" y="145" font-size="16" font-weight="bold" fill="#111827" font-family="Arial, sans-serif">Avg Grade</text>
      <text x="920" y="180" font-size="32" font-weight="bold" fill="#f59e0b" font-family="Arial, sans-serif">8.5/10</text>
    </svg>
  `);

  try {
    await sharp(desktopSvg)
      .resize(1280, 720, { fit: 'fill' })
      .png()
      .toFile(path.join(publicDir, 'screenshot-1280x720.png'));

    console.log(`✅ Generated: screenshot-1280x720.png (desktop)`);
  } catch (error) {
    console.error(`❌ Error generating desktop screenshot:`, error.message);
  }
}

async function main() {
  console.log('🎨 Generating PWA icons...\n');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`📁 Created ${publicDir}\n`);
  }

  // Generate all icons
  await generateIcon(192, false);
  await generateIcon(512, false);
  await generateIcon(192, true);
  await generateIcon(512, true);
  await generateAppleTouchIcon();
  await generateFavicon();
  await generateScreenshots();

  console.log('\n✅ All PWA assets generated successfully!');
  console.log(`📁 Location: ${publicDir}`);
  console.log('\n📝 Next steps:');
  console.log('1. Review generated icons in frontend/public/');
  console.log('2. Update favicon.svg if preferred over favicon.png');
  console.log('3. Test PWA on mobile: npm run dev → Install app');
  console.log('4. Check manifest icons in DevTools → Application → Manifest');
}

main().catch(console.error);
