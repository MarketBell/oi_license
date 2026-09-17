import crypto from 'crypto';

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(body));
}

// License key like OIPD-A1B2-C3D4-E5F6-7890
export function genKey() {
  const raw = crypto.randomBytes(10).toString('hex').toUpperCase();
  return 'OIPD-' + raw.match(/.{1,4}/g).join('-');
}

export function isAdmin(req) {
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret) && req.headers['x-admin-secret'] === secret;
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export const norm = (v) => String(v || '').trim().toUpperCase();
