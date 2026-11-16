// Serveur de la table de cartes : état de chaque table en mémoire, synchronisé par WebSocket.
// Le serveur est l'autorité : il n'envoie à chaque joueur que SA main (les autres ne voient que le nombre de cartes).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const INDEX = path.join(__dirname, 'public', 'index.html');

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok'); return; }
  fs.readFile(INDEX, (err, data) => {
    if (err) { res.writeHead(500); res.end('Erreur serveur'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const rooms = new Map();

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const newDeck = jokers => shuffle([...Array(jokers ? 54 : 52).keys()]);

function getRoom(code) {
  let r = rooms.get(code);
  if (!r) {
    r = { code, jokers: true, deck: newDeck(true), pile: [], players: [], last: Date.now() };
    rooms.set(code, r);
  }
  return r;
}

function view(room, p) {
  return {
    t: 'state',
    room: room.code,
    jokers: room.jokers,
    deck: room.deck.length,
    // une carte posée face cachée n'est révélée qu'à celui qui l'a posée
    pile: room.pile.map((x, i) => ({ i, up: x.up, c: x.up || x.by === p.pid ? x.c : null })),
    players: room.players.map(q => ({ id: q.pid, name: q.name, n: q.hand.length, on: !!q.ws })),
    me: p.pid,
    hand: p.hand,
  };
}

function broadcast(room) {
  for (const p of room.players) {
    if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(view(room, p)));
  }
}

function act(room, p, m) {
  switch (m.t) {
    case 'draw':
      if (room.deck.length) p.hand.push(room.deck.shift());
      break;
    case 'play': {
      const i = p.hand.indexOf(m.c);
      if (i > -1) { p.hand.splice(i, 1); room.pile.push({ c: m.c, up: m.up !== false, by: p.pid }); }
      break;
    }
    case 'take': {
      const x = room.pile[m.i];
      if (x && (x.up || x.by === p.pid)) { room.pile.splice(m.i, 1); p.hand.push(x.c); }
      break;
    }
    case 'flip': {
      const x = room.pile[m.i];
      if (x) x.up = true;
      break;
    }
    case 'deal': {
      const n = Math.max(1, Math.min(20, (m.n | 0) || 1));
      for (let r = 0; r < n; r++) for (const q of room.players) {
        if (!room.deck.length) return;
        q.hand.push(room.deck.shift());
      }
      break;
    }
    case 'gather':
      room.deck = shuffle(room.deck.concat(room.pile.map(x => x.c)));
      room.pile = [];
      break;
    case 'shuffle':
      room.deck = shuffle(room.deck);
      break;
    case 'reset':
      room.jokers = !!m.jokers;
      room.deck = newDeck(room.jokers);
      room.pile = [];
      room.players.forEach(q => { q.hand = []; });
      break;
  }
}

wss.on('connection', ws => {
  let room = null, me = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'join') {
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code || room) return;
      const token = typeof m.token === 'string' && m.token.length >= 16 && m.token.length <= 64 ? m.token : null;
      if (!token) return;
      const r = getRoom(code);
      let p = r.players.find(q => q.token === token);
      const name = String(m.name || '').trim().slice(0, 14) || 'Joueur';
      if (!p) {
        if (r.players.length >= MAX_PLAYERS) { ws.send(JSON.stringify({ t: 'err', msg: 'Table pleine (8 joueurs maximum).' })); return; }
        p = { pid: crypto.randomBytes(4).toString('hex'), token, name, hand: [], ws: null };
        r.players.push(p);
      } else {
        p.name = name;
        if (p.ws && p.ws !== ws) { try { p.ws.close(); } catch {} }
      }
      p.ws = ws; room = r; me = p; r.last = Date.now();
      broadcast(r);
      return;
    }

    if (!room || !me) return;
    if (m.t === 'leave') {
      room.deck = room.deck.concat(shuffle(me.hand));
      room.players = room.players.filter(q => q !== me);
      me.ws = null; me = null;
      broadcast(room);
      try { ws.close(); } catch {}
      return;
    }
    act(room, me, m);
    room.last = Date.now();
    broadcast(room);
  });

  ws.on('close', () => {
    if (me && me.ws === ws) { me.ws = null; if (room) broadcast(room); }
  });
});

// Coupe les connexions mortes (téléphone endormi, tunnel, etc.)
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 25000);

// Supprime les tables abandonnées depuis plus de 6 h
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.last > 6 * 3600 * 1000 && !r.players.some(p => p.ws)) rooms.delete(code);
  }
}, 10 * 60 * 1000);

server.listen(PORT, () => console.log('Table de cartes sur http://localhost:' + PORT));
