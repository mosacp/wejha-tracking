const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/track') {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 5000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const input = JSON.parse(raw || '{}');
        const awb = String(input.awb || '').trim();
        if (!awb || awb.length > 80) {
          res.writeHead(400, {'Content-Type':'application/json; charset=utf-8'});
          return res.end(JSON.stringify({error:{message:'رقم التتبع غير صالح'}}));
        }
        const upstream = await fetch('https://tracksa.com/v1/track', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({awb, carrier:'aramex'}),
          signal: AbortSignal.timeout(20000)
        });
        const body = await upstream.text();
        res.writeHead(upstream.status, {
          'Content-Type':'application/json; charset=utf-8',
          'Cache-Control':'no-store'
        });
        res.end(body);
      } catch (err) {
        res.writeHead(502, {'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify({error:{message:'تعذر الاتصال بمزود التتبع حالياً'}}));
      }
    });
    return;
  }

  const pathname = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, {'Content-Type':type});
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Wejha is running on port ${PORT}`));
