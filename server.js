const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 7355;
const HOST = '127.0.0.1';
const PRESETS_FILE = path.join(__dirname, 'presets.json');

// Текущие данные титров в памяти
let titres = {
  line1: '',
  line2: '',
  line3: '',
  graphic: '',
  visible: false,
  style: 'lower',
  animation: 'fade',
  offsetX: 0,
  offsetY: 0,
  graphicOffsetX: 0,
  graphicOffsetY: 0,
  graphicScale: 100,
  graphicAlign: 'center',
  fontFamily: 'Segoe UI, Arial, sans-serif'
};

function loadPresets() {
  try {
    if (!fs.existsSync(PRESETS_FILE)) return [];
    const raw = fs.readFileSync(PRESETS_FILE, 'utf8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function savePresets(arr) {
  try {
    const dir = path.dirname(PRESETS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    console.error('Ошибка сохранения заготовок:', e.message);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  // API: получить титры
  if (pathname === '/api/titres' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(titres));
    return;
  }

  // API: установить титры
  if (pathname === '/api/titres' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.line1 !== undefined) titres.line1 = String(data.line1);
        if (data.line2 !== undefined) titres.line2 = String(data.line2);
        if (data.line3 !== undefined) titres.line3 = String(data.line3);
        if (data.graphic !== undefined) titres.graphic = String(data.graphic);
        if (data.visible !== undefined) titres.visible = !!data.visible;
        if (data.style !== undefined) titres.style = String(data.style);
        if (data.animation !== undefined) titres.animation = String(data.animation);
        if (data.offsetX !== undefined) titres.offsetX = Number(data.offsetX) || 0;
        if (data.offsetY !== undefined) titres.offsetY = Number(data.offsetY) || 0;
        if (data.graphicOffsetX !== undefined) titres.graphicOffsetX = Number(data.graphicOffsetX) || 0;
        if (data.graphicOffsetY !== undefined) titres.graphicOffsetY = Number(data.graphicOffsetY) || 0;
        if (data.graphicScale !== undefined) titres.graphicScale = Math.min(300, Math.max(10, Number(data.graphicScale) || 100));
        if (data.graphicAlign !== undefined) titres.graphicAlign = ['left', 'center', 'right'].includes(data.graphicAlign) ? data.graphicAlign : 'center';
        if (data.fontFamily !== undefined) titres.fontFamily = String(data.fontFamily || 'Segoe UI, Arial, sans-serif').trim() || 'Segoe UI, Arial, sans-serif';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(titres));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API: список заготовок
  if (pathname === '/api/presets' && req.method === 'GET') {
    const list = loadPresets();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list));
    return;
  }

  // API: сохранить заготовку
  if (pathname === '/api/presets' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const list = loadPresets();
        const id = String(Date.now());
        const preset = {
          id,
          name: String(data.name || 'Без названия').trim() || 'Без названия',
          line1: String(data.line1 || ''),
          line2: String(data.line2 || ''),
          line3: String(data.line3 || ''),
          graphic: String(data.graphic || ''),
          style: String(data.style || 'lower'),
          animation: String(data.animation || 'fade'),
          offsetX: Number(data.offsetX) || 0,
          offsetY: Number(data.offsetY) || 0,
          graphicOffsetX: Number(data.graphicOffsetX) || 0,
          graphicOffsetY: Number(data.graphicOffsetY) || 0,
          graphicScale: Math.min(300, Math.max(10, Number(data.graphicScale) || 100)),
          graphicAlign: ['left', 'center', 'right'].includes(data.graphicAlign) ? data.graphicAlign : 'center',
          fontFamily: String(data.fontFamily || 'Segoe UI, Arial, sans-serif').trim() || 'Segoe UI, Arial, sans-serif'
        };
        list.push(preset);
        savePresets(list);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(preset));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON', detail: e.message }));
      }
    });
    return;
  }

  // API: удалить заготовку
  if (pathname === '/api/presets' && req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'id required' }));
      return;
    }
    const list = loadPresets().filter(p => p.id !== id);
    savePresets(list);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // API: показать/скрыть
  if (pathname === '/api/visible' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        titres.visible = data.visible !== false;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ visible: titres.visible }));
      } catch (e) {
        res.writeHead(400);
        res.end('{}');
      }
    });
    return;
  }

  // Страница вывода для vMix (только титры, без интерфейса)
  if (pathname === '/output' || pathname === '/output/') {
    serveFile(path.join(__dirname, 'output.html'), res);
    return;
  }

  // Панель управления
  if (pathname === '/' || pathname === '/control' || pathname === '/control/') {
    serveFile(path.join(__dirname, 'control.html'), res);
    return;
  }

  // Статика: /public/logo.png -> папка public/logo.png
  if (pathname.startsWith('/public/') && !pathname.includes('..')) {
    const rel = pathname.slice(8); // убираем '/public/'
    const filePath = path.join(__dirname, 'public', rel);
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (!err) {
        serveFile(filePath, res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// при старте создать пустой файл заготовок, если нет
try {
  if (!fs.existsSync(PRESETS_FILE)) {
    savePresets([]);
  }
} catch (e) {}

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Титры для vMix запущены.');
  console.log('  Панель управления: http://' + HOST + ':' + PORT + '/');
  console.log('  Вывод для vMix:    http://' + HOST + ':' + PORT + '/output');
  console.log('');
  console.log('  В vMix: Add Input -> Web Browser -> URL: http://' + HOST + ':' + PORT + '/output');
  console.log('  Укажите размер (например 1920x1080).');
  console.log('');
});
