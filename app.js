// const express = require('express');
// const cors = require('cors');

// const connectDB = require('./config/db');
// const routes = require('./routes');
// const errorHandler = require('./middleware/errorHandler');

// const app = express();

// // Connect to database
// connectDB();

// // Global middleware
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN || '*',
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   }),
// );
// app.use(express.json());

// // Routes
// app.use('/api', routes);

// // Health check
// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// // Error handling
// app.use(errorHandler);

// module.exports = app;

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { preloadAllProfessions } = require('./services/cachePreloader');

const app = express();
const axios = require('axios');

// Add this route before your other routes
app.get('/proxy/image', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url query param required' });
  }


  try {
    const decoded = decodeURIComponent(url);

    const response = await axios.get(decoded, {
      responseType: 'stream',
      timeout: 10000,
      headers: {
        // Pretend to be a browser so sources don't block us
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'image/*,*/*',
      },
    });

    // Forward the content type
    const contentType =
      response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);

    // Allow Flutter web to load it
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h

    response.data.pipe(res);
  } catch (error) {
    res.status(502).json({ error: 'Failed to fetch image' });
  }
});

connectDB().then(() => {
 // Only preload after DB is connected
  preloadAllProfessions().catch((err) => {
    console.error('[Preloader] Preload failed:', err.message);
  });
});



app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/api', routes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

module.exports = app;
