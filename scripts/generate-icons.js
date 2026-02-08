/**
 * Icon Generation Script for Windows Installer
 * Generates .ico file from PNG for electron-builder
 */

const toIco = require('to-ico');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateWindowsIcon() {
  try {
    console.log('🎨 Generating Windows .ico file from PNG...');
    
    const inputPath = path.join(__dirname, '../public/icon.png');
    const outputPath = path.join(__dirname, '../public/icon.ico');
    
    // Check if PNG exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Source PNG not found: ${inputPath}`);
    }
    
    // Read and resize the PNG to sizes suitable for ICO format
    // ICO files typically contain 16x16, 32x32, 48x48, and 256x256
    const sizes = [256, 64, 48, 32, 16];
    const buffers = await Promise.all(
      sizes.map(size => 
        sharp(inputPath)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      )
    );
    
    // Generate ICO from multiple sizes
    const icoBuffer = await toIco(buffers);
    
    // Write the ICO file
    fs.writeFileSync(outputPath, icoBuffer);
    
    console.log('✅ Successfully generated icon.ico');
    console.log(`   Path: ${outputPath}`);
    console.log(`   Size: ${(icoBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Contains: ${sizes.join('x, ')}x sizes`);
    
  } catch (error) {
    console.error('❌ Error generating Windows icon:', error.message);
    console.error(error);
    process.exit(1);
  }
}

generateWindowsIcon();
