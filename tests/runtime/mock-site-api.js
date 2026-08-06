import http from 'http';
import crypto from 'crypto';

export function createMockApiServer(port = 9876) {
  let simServerError = false;
  const publishCalls = [];
  const mediaUploads = [];

  const server = http.createServer((req, res) => {
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(bodyChunks);
      const url = req.url || '';

      if (simServerError && url.includes('/publish')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: true, statusCode: 500, message: 'Internal Server Error simulated for publish endpoint' }));
      }

      if (req.method === 'GET' && url.startsWith('/content/')) {
        const contentId = url.replace('/content/', '').split('?')[0];
        if (contentId === 'INVALID_CONTENT_ID') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: true, statusCode: 404, message: 'Content not found' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ contentId, title: 'Existing Published Page', status: 'published', bodyHtml: '<p>Old content</p>' }));
      }

      if (req.method === 'POST' && url.includes('/publish')) {
        const parts = url.split('/');
        const contentId = parts[2];
        const idempotencyKey = req.headers['idempotency-key'] || null;
        publishCalls.push({ contentId, idempotencyKey, timestamp: Date.now() });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          contentId,
          publishedUrls: {
            ar: `https://example.com/ar/articles/${contentId}`,
            en: `https://example.com/en/articles/${contentId}`
          }
        }));
      }

      if (req.method === 'POST' && url.endsWith('/media')) {
        const jobId = req.headers['x-job-id'] || 'unknown';
        const assetKey = req.headers['x-asset-key'] || 'asset';
        const assetType = req.headers['x-asset-type'] || 'image';
        const checksum = crypto.createHash('sha256').update(rawBody).digest('hex');

        const uploadRecord = {
          mediaId: `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          jobId,
          assetKey,
          assetType,
          finalUrl: `https://cdn.example.com/media/${assetKey}-${checksum.substring(0, 8)}.webp`,
          checksum,
          fileSizeBytes: rawBody.length,
          mimeType: 'image/webp',
          width: 1200,
          height: 630
        };
        mediaUploads.push(uploadRecord);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(uploadRecord));
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: true, message: 'Endpoint not found' }));
    });
  });

  return {
    server,
    listen: () => new Promise(resolve => server.listen(port, resolve)),
    close: () => new Promise(resolve => server.close(resolve)),
    setSimulateServerError: (val) => { simServerError = val; },
    getPublishCalls: () => publishCalls,
    getMediaUploads: () => mediaUploads,
    clearLogs: () => { publishCalls.length = 0; mediaUploads.length = 0; simServerError = false; }
  };
}
