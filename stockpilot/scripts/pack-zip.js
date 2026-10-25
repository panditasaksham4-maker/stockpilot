const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const desktopZip = path.resolve('c:/Users/saksh/OneDrive/Desktop/StockPilot_Inventory_System.zip');
const projectZip = path.resolve(rootDir, '../StockPilot_Inventory_System.zip');
const publicZip = path.resolve(rootDir, 'public/StockPilot_Inventory_System.zip');

const tempDir = path.resolve(require('os').tmpdir(), 'stockpilot_pkg_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const itemsToCopy = ['src', 'public', 'scripts', 'tests', 'data', 'package.json', 'package-lock.json', 'README.md', '.env.example', 'render.yaml'];

for (const item of itemsToCopy) {
  const srcPath = path.resolve(rootDir, item);
  const destPath = path.resolve(tempDir, item);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  }
}

// Ensure nested zip is removed from temp public
const nested = path.resolve(tempDir, 'public/StockPilot_Inventory_System.zip');
if (fs.existsSync(nested)) {
  fs.unlinkSync(nested);
}

// Run PowerShell Compress-Archive
const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${desktopZip}' -Force"`;
console.log('Compressing to desktop...');
execSync(psCommand, { stdio: 'inherit' });

// Copy to project and public
fs.copyFileSync(desktopZip, projectZip);
fs.copyFileSync(desktopZip, publicZip);

// Cleanup temp dir
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Zip packages generated successfully at:');
console.log('1.', desktopZip);
console.log('2.', projectZip);
console.log('3.', publicZip);
