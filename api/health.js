// GET /api/health  -> service + DB connectivity check.
import { getDb } from './_db.js';
import { send } from './_util.js';

export default async function handler(req, res) {
  try {
    await getDb();
    return send(res, 200, { ok: true, service: 'oi-license-server', db: 'connected', time: new Date().toISOString() });
  } catch (e) {
    return send(res, 500, { ok: false, db: 'error', error: e.message });
  }
}
