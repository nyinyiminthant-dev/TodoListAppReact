const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const publicDir = path.join(__dirname, 'public');
  
  // Read the favicon SVG
  const faviconSvg = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');
  
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 }
  ];
  
  for (const { name, size } of sizes) {
    await sharp(Buffer.from(faviconSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`Generated ${name} from favicon.svg`);
  }
  
  // Generate maskable icon
  await sharp(Buffer.from(faviconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'maskable-icon.png'));
  console.log('Generated maskable-icon.png');
}

generateIcons().catch(console.error);