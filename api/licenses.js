// GET /api/licenses  (admin)  header: x-admin-secret
// Lists recent license keys with their binding + status (for the admin panel).
import { licenses } from './_db.js';
import { send, isAdmin } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });
  if (!isAdmin(req)) return send(res, 401, { ok: false, error: 'Unauthorized' });
  try {
    const col = await licenses();
    const docs = await col.find({}).sort({ created_at: -1 }).limit(500).toArray();
    const list = docs.map((d) => ({
      key: d.key,
      account_id: d.account_id || null,
      status: d.status || 'active',
      buyer_name: d.buyer_name || '',
      buyer_email: d.buyer_email || '',
      buyer_mobile: d.buyer_mobile || '',
      expiry: d.expiry || null,
      activated_at: d.activated_at || null,
      created_at: d.created_at || null,
    }));
    return send(res, 200, { ok: true, count: list.length, licenses: list });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
}
