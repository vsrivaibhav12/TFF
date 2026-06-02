const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (f === 'node_modules' || f === '.git' || f === '.next') return;
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.resolve('./app'), processFile);
walkDir(path.resolve('./components'), processFile);

function processFile(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/stone-/g, 'zinc-');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated ${filePath}`);
    }
  }
}
