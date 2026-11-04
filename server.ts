import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './src/server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Export app for serverless / testing
export default app;

// Start local dev or production container server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(await import('express').then(e => e.default.static(path.resolve(__dirname, 'dist'))));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Radar CPC] Servidor ativo em http://localhost:${PORT}`);
    console.log(`[Radar CPC] Modelo IA Alvo: nvidia/nemotron-3-ultra-550b-a55b:free via OpenRouter`);
  });
}

// Only listen when executed directly (not when imported in serverless environments)
if (!process.env.VERCEL) {
  startServer();
}
