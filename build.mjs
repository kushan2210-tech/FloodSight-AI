import { build } from 'esbuild';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'dist');
const assetsDir = path.join(outDir, 'assets');
const mode = process.argv[2] || 'build';
const port = Number(process.env.PORT || (mode === 'preview' ? 4173 : 3000));

async function compile() {
  await mkdir(assetsDir, { recursive: true });
  await build({
    entryPoints: [path.join(root, 'src/main.jsx')],
    bundle: true,
    minify: mode !== 'dev',
    sourcemap: mode === 'dev',
    platform: 'browser',
    format: 'iife',
    target: ['es2020'],
    outfile: path.join(assetsDir, 'app.js'),
    assetNames: 'media/[name]-[hash]',
    loader: { '.png': 'file', '.jpg': 'file', '.jpeg': 'file', '.svg': 'file', '.woff': 'file', '.woff2': 'file' },
    logLevel: 'info'
  });
  await copyFile(path.join(root, 'index.html'), path.join(outDir, 'index.html'));
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.woff2':'font/woff2' })[ext] || 'application/octet-stream';
}

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let target = path.resolve(outDir, `.${pathname}`);
      if (target !== outDir && !target.startsWith(outDir + path.sep)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (!existsSync(target) || (await stat(target)).isDirectory()) target = path.join(outDir, 'index.html');
      const body = await readFile(target);
      res.writeHead(200, { 'Content-Type': contentType(target), 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(500); res.end('Unable to serve this resource.');
    }
  });
  server.listen(port, '0.0.0.0', () => console.log(`FloodSight AI ${mode} server running at http://localhost:${port}`));
}

if (mode === 'dev') {
  await compile();
  await serve();
} else if (mode === 'build') {
  await compile();
  console.log('Production files written to dist/');
} else if (mode === 'preview') {
  if (!existsSync(path.join(outDir, 'index.html'))) {
    console.error('No production build found. Run "npm run build" first.');
    process.exit(1);
  }
  await serve();
} else {
  console.error(`Unknown command: ${mode}`);
  process.exit(1);
}
