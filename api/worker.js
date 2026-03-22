// weapon-quest-api Cloudflare Worker (Classic Service Worker format)
// KV binding will be set via Cloudflare dashboard

const KV_NS_ID = '96777ae880d94a8a9984a7f4a02684be';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'wquest-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  return (await hashPassword(password)) === hash;
}

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

async function kvGet(key) {
  const url = 'https://api.cloudflare.com/client/v4/accounts/903e758019449ff5b6d2029d8f182d29/storage/kv/namespaces/' + KV_NS_ID + '/values/' + encodeURIComponent(key);
  const resp = await fetch(url, {
    headers: {
      'X-Auth-Email': 'weiminng87@gmail.com',
      'X-Auth-Key': 'cfk_xkMUotk8gT2xOoPxq8JfnV6HuQzoGEfQgLhX7Yxe2f42c37a'
    }
  });
  if (!resp.ok) return null;
  return resp.text();
}

async function kvPut(key, value, ttlSeconds) {
  const url = 'https://api.cloudflare.com/client/v4/accounts/903e758019449ff5b6d2029d8f182d29/storage/kv/namespaces/' + KV_NS_ID + '/values/' + encodeURIComponent(key);
  const options = ttlSeconds ? '?expiration_ttl=' + ttlSeconds : '';
  const resp = await fetch(url + options, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
      'X-Auth-Email': 'weiminng87@gmail.com',
      'X-Auth-Key': 'cfk_xkMUotk8gT2xOoPxq8JfnV6HuQzoGEfQgLhX7Yxe2f42c37a'
    },
    body: String(value)
  });
  return resp.ok;
}

async function kvDelete(key) {
  const url = 'https://api.cloudflare.com/client/v4/accounts/903e758019449ff5b6d2029d8f182d29/storage/kv/namespaces/' + KV_NS_ID + '/values/' + encodeURIComponent(key);
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-Auth-Email': 'weiminng87@gmail.com',
      'X-Auth-Key': 'cfk_xkMUotk8gT2xOoPxq8JfnV6HuQzoGEfQgLhX7Yxe2f42c37a'
    }
  });
  return resp.ok;
}

const DEFAULT_USER_DATA = JSON.stringify({
  name: '', gold: 0, xp: 0, level: 1, currentWp: 0, fragments: 0,
  ownedWp: [], streak: 0, totalDone: 0, lastDate: '', tasks: [], history: [],
  templates: [], createdAt: '', soundEnabled: true
});

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '').split('/').pop();

  let body = {};
  try { body = await request.json(); } catch(e) {}

  // Register
  if (path === 'register') {
    const { username, password } = body;
    if (!username || !password) return jsonResponse({ error: '缺少用户名或密码' }, 400);
    if (username.length < 2 || username.length > 20) return jsonResponse({ error: '用户名需2-20字' }, 400);
    if (password.length < 4) return jsonResponse({ error: '密码至少4位' }, 400);

    const usersRaw = await kvGet('users') || '{}';
    const allUsers = JSON.parse(usersRaw);
    if (allUsers[username]) return jsonResponse({ error: '用户名已存在' }, 409);

    const hash = await hashPassword(password);
    allUsers[username] = { hash, createdAt: Date.now() };
    await kvPut('users', JSON.stringify(allUsers));

    const token = generateToken();
    await kvPut('token_' + token, username, 60 * 60 * 24 * 30); // 30 days
    await kvPut('user_' + username + '_data', DEFAULT_USER_DATA);

    return jsonResponse({ token, username });
  }

  // Login
  if (path === 'login') {
    const { username, password } = body;
    if (!username || !password) return jsonResponse({ error: '缺少用户名或密码' }, 400);

    const usersRaw = await kvGet('users') || '{}';
    const allUsers = JSON.parse(usersRaw);
    const user = allUsers[username];
    if (!user) return jsonResponse({ error: '用户名不存在' }, 404);
    if (!await verifyPassword(password, user.hash)) return jsonResponse({ error: '密码错误' }, 401);

    const token = generateToken();
    await kvPut('token_' + token, username, 60 * 60 * 24 * 30);
    const userData = await kvGet('user_' + username + '_data') || DEFAULT_USER_DATA;

    return jsonResponse({ token, username, data: JSON.parse(userData) });
  }

  // Auth check helper
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return jsonResponse({ error: '未登录' }, 401);

  const tokenKey = 'token_' + token;
  const username = await kvGet(tokenKey);
  if (!username) return jsonResponse({ error: '登录已过期，请重新登录' }, 401);

  // Get data
  if (path === 'getData') {
    const data = await kvGet('user_' + username + '_data') || DEFAULT_USER_DATA;
    return jsonResponse({ data: JSON.parse(data) });
  }

  // Save data
  if (path === 'saveData') {
    const { data } = body;
    if (!data) return jsonResponse({ error: '缺少数据' }, 400);
    await kvPut('user_' + username + '_data', JSON.stringify(data));
    return jsonResponse({ ok: true });
  }

  // Logout
  if (path === 'logout') {
    await kvDelete(tokenKey);
    return jsonResponse({ ok: true });
  }

  // Change password
  if (path === 'changePassword') {
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) return jsonResponse({ error: '缺少参数' }, 400);
    const usersRaw = await kvGet('users') || '{}';
    const allUsers = JSON.parse(usersRaw);
    const user = allUsers[username];
    if (!user) return jsonResponse({ error: '用户不存在' }, 404);
    if (!await verifyPassword(oldPassword, user.hash)) return jsonResponse({ error: '旧密码错误' }, 401);
    allUsers[username].hash = await hashPassword(newPassword);
    await kvPut('users', JSON.stringify(allUsers));
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: '未知操作' }, 404);
}

addEventListener('fetch', function(event) {
  event.respondWith(handleRequest(event.request));
});
