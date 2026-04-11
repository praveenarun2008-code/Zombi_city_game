const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '127.0.0.1';
const preferredPort = Number(process.env.PORT) || 8080;
let currentPort = preferredPort;
const rootDir = __dirname;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function safeResolve(urlPath) {
  const normalizedPath = decodeURIComponent(urlPath.split('?')[0]);
  const trimmedPath = normalizedPath === '/' ? '/menu.html' : normalizedPath;
  const filePath = path.normalize(path.join(rootDir, trimmedPath));

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = safeResolve(req.url || '/');

  if (!filePath) {
    send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }

  let finalPath = filePath;
  if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
    finalPath = path.join(finalPath, 'index.html');
  }

  fs.readFile(finalPath, (error, data) => {
    if (error) {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'File not found');
      return;
    }

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';
    send(res, 200, { 'Content-Type': contentType }, data);
  });
});

function listen(port) {
  currentPort = port;
  server.listen(port, host, () => {
    console.log(`Zombie City Escape is running at http://${host}:${port}/`);
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const nextPort = currentPort + 1;

    if (nextPort > preferredPort + 10) {
      console.error('Could not find a free port between 8080 and 8090.');
      process.exit(1);
    }

    console.log(`Port in use, trying http://${host}:${nextPort}/ instead...`);
    setTimeout(() => listen(nextPort), 100);
    return;
  }

  throw error;
});

listen(preferredPort);
