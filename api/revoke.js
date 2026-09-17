// POST /api/revoke  (admin)  header: x-admin-secret
// Body: { license_key, status? }  -> status defaults to "revoked"; use "active" to re-enable.
// Optional: { reset_account: true } clears the account binding so it can be re-linked.
import { licenses } from './_db.js';
import { send, readBody, isAdmin, norm } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  if (!isAdmin(req)) return send(res, 401, { ok: false, error: 'Unauthorized' });
  try {
    const body = await readBody(req);
    const key = norm(body.license_key);
    if (!key) return send(res, 400, { ok: false, error: 'license_key is required' });
    const status = ['active', 'revoked', 'suspended'].includes(body.status) ? body.status : 'revoked';

    const set = { status };
    if (body.reset_account) { set.account_id = null; set.activated_at = null; }

    const col = await licenses();
    const result = await col.updateOne({ key }, { $set: set });
    if (!result.matchedCount) return send(res, 404, { ok: false, error: 'License key not found' });
    return send(res, 200, { ok: true, key, status, reset_account: Boolean(body.reset_account) });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
}
