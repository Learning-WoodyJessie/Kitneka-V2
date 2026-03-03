import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;
const API_URL = process.env.VITE_API_BASE || 'http://localhost:8000';

// Serve static React build files
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy /api requests to the FastAPI backend
app.use('/api', createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
}));

// Route everything else to React index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Proxying /api to ${API_URL}`);
});
