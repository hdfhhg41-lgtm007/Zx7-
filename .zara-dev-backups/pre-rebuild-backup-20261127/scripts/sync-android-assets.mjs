import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const androidWwwDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'www');

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[sync-android-assets] Missing dist/index.html. Run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(androidWwwDir, { recursive: true, force: true });
fs.mkdirSync(androidWwwDir, { recursive: true });
fs.cpSync(distDir, androidWwwDir, { recursive: true });

// Remove service worker files from native APK assets so WebViewAssetLoader serves files directly
for (const swFile of ['sw.js', 'registerSW.js', 'manifest.webmanifest']) {
  const candidate = path.join(androidWwwDir, swFile);
  if (fs.existsSync(candidate)) {
    fs.rmSync(candidate, { force: true });
  }
}

for (const entry of fs.readdirSync(androidWwwDir)) {
  if (entry.startsWith('workbox-') && entry.endsWith('.js')) {
    fs.rmSync(path.join(androidWwwDir, entry), { force: true });
  }
}

console.log(`[sync-android-assets] Bundled native Android web assets into ${androidWwwDir}`);
