const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/logo.PNG');
const outputDir = path.join(__dirname, '../public');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Define logo sizes
const sizes = [
  { width: 32, height: 32, name: 'favicon.ico' },
  { width: 192, height: 192, name: 'logo-192.png' },
  { width: 512, height: 512, name: 'logo-512.png' },
  { width: 1200, height: 630, name: 'og-image.png' },
];

// Process each size
async function generateLogos() {
  try {
    for (const size of sizes) {
      await sharp(inputFile)
        .resize(size.width, size.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toFile(path.join(outputDir, size.name));
      
      console.log(`Generated ${size.name} (${size.width}x${size.height})`);
    }
    
    console.log('All logos generated successfully!');
  } catch (error) {
    console.error('Error generating logos:', error);
    process.exit(1);
  }
}

generateLogos();
