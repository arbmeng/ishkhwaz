// Generate PNG icons from logo.svg using sharp or canvas
const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, 'public', 'logo.svg'), 'utf8');

// We'll use the browser's canvas via a simple approach
// Since we may not have sharp, let's use a pure SVG data URI approach
// and create proper PNG files using node-canvas if available,
// or just create optimized SVG-based icons

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('sharp not available, trying canvas...');
}

if (sharp) {
  const svgBuffer = Buffer.from(svgContent);
  Promise.all(sizes.map(size => {
    return sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, 'public', `icon-${size}x${size}.png`))
      .then(() => console.log(`✓ icon-${size}x${size}.png`));
  })).then(() => {
    // Also create the main logo.png at 512x512
    return sharp(svgBuffer).resize(512, 512).png()
      .toFile(path.join(__dirname, 'public', 'logo.png'));
  }).then(() => {
    console.log('✓ logo.png created');
    console.log('All icons generated!');
  }).catch(console.error);
} else {
  // Fallback: install sharp and run
  console.log('Installing sharp...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    console.log('sharp installed. Re-running...');
    delete require.cache[require.resolve('sharp')];
    sharp = require('sharp');
    const svgBuffer = Buffer.from(svgContent);
    Promise.all(sizes.map(size => {
      return sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, 'public', `icon-${size}x${size}.png`))
        .then(() => console.log(`✓ icon-${size}x${size}.png`));
    })).then(() => {
      return sharp(svgBuffer).resize(512, 512).png()
        .toFile(path.join(__dirname, 'public', 'logo.png'));
    }).then(() => {
      console.log('✓ logo.png\nAll icons generated!');
    });
  } catch (err) {
    console.error('Could not install sharp:', err.message);
  }
}
