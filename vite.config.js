import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 管理画面からspots.jsonを保存するためのViteプラグイン
function spotsApiPlugin() {
  return {
    name: 'spots-api',
    configureServer(server) {
      server.middlewares.use('/__api/save-spots', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            // JSONとしてパース（バリデーション）
            const data = JSON.parse(body);
            if (!Array.isArray(data.spots)) {
              res.statusCode = 400;
              res.end('Invalid format: spots array required');
              return;
            }
            const filePath = path.resolve(__dirname, 'public/data/spots.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end('Save failed: ' + e.message);
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [basicSsl(), spotsApiPlugin()],
  server: {
    https: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
