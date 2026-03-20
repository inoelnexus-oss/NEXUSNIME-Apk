import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // User-Agent Spoofing
  const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // API Route to check for new episodes
  app.post('/api/check-episodes', async (req, res) => {
    const { animeName, serverId } = req.body;
    
    const SERVERS: Record<string, any> = {
      'SERVER_01': { name: 'TioAnime', searchUrl: (q: string) => `https://tioanime.com/directorio?q=${encodeURIComponent(q)}` },
      'SERVER_02': { name: 'JKAnime', searchUrl: (q: string) => `https://jkanime.net/buscar/${encodeURIComponent(q)}/1/` },
      'SERVER_03': { name: 'MonosChinos', searchUrl: (q: string) => `https://www.monoschinos2.net/buscar?q=${encodeURIComponent(q)}` }
    };

    const server = SERVERS[serverId];
    if (!server) {
      return res.status(400).json({ error: 'Servidor no válido' });
    }

    try {
      const searchUrl = server.searchUrl(animeName);
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      let latestEpisode = 'No encontrado';

      // Lógica de scraping básica por servidor
      if (serverId === 'SERVER_01') {
        // TioAnime: .anime blocks
        const firstResult = $('.anime').first();
        latestEpisode = firstResult.find('.episodes-count').text().trim() || 
                        firstResult.find('.episodes').text().trim() || 
                        'Encontrado';
      } else if (serverId === 'SERVER_02') {
        // JKAnime: .anime__item
        const firstResult = $('.anime__item').first();
        latestEpisode = firstResult.find('.episodes').text().trim() || 
                        firstResult.find('.anime__item__text span').text().trim() || 
                        'Encontrado';
      } else if (serverId === 'SERVER_03') {
        // MonosChinos: .series-item
        const firstResult = $('.series-item').first();
        latestEpisode = firstResult.find('.episodes').text().trim() || 
                        firstResult.find('.series-item__episodes').text().trim() || 
                        'Encontrado';
      }

      res.json({ latestEpisode });
    } catch (error) {
      console.error('Error scraping:', error);
      res.status(500).json({ error: 'Error al escanear el servidor' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXUSNIME_OS Server running on http://localhost:${PORT}`);
  });
}

startServer();
