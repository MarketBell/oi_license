// POST /api/activate  { license_key, account_id }
// Binds a license to the first trading account it sees, then only that account
// may use it — on ANY number of devices. A different account is rejected.
import { licenses } from './_db.js';
import { send, readBody, norm } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await readBody(req);
    const key = norm(body.license_key);
    const account = norm(body.account_id);
    if (!key || !account) {
      return send(res, 400, { ok: false, error: 'license_key and account_id are required' });
    }

    const col = await licenses();
    const lic = await col.findOne({ key });
    if (!lic) return send(res, 404, { ok: false, error: 'Invalid license key' });
    if (lic.status && lic.status !== 'active') {
      return send(res, 403, { ok: false, error: `License is ${lic.status}` });
    }
    if (lic.expiry && new Date(lic.expiry) < new Date()) {
      return send(res, 403, { ok: false, error: 'License has expired' });
    }

    if (!lic.account_id) {
      await col.updateOne({ _id: lic._id }, { $set: { account_id: account, activated_at: new Date(), last_seen: new Date() } });
      return send(res, 200, { ok: true, status: 'activated', account_id: account, expiry: lic.expiry || null });
    }
    if (lic.account_id === account) {
      await col.updateOne({ _id: lic._id }, { $set: { last_seen: new Date() } });
      return send(res, 200, { ok: true, status: 'valid', account_id: account, expiry: lic.expiry || null });
    }
    return send(res, 409, { ok: false, error: 'This license is already linked to a different trading account' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
}
