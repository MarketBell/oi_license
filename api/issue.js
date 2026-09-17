// POST /api/issue  (admin)  header: x-admin-secret
// Body: { buyer_name, buyer_email, buyer_mobile, expiry? }  -> creates a new license key.
import { licenses } from './_db.js';
import { send, readBody, isAdmin, genKey } from './_util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  if (!isAdmin(req)) return send(res, 401, { ok: false, error: 'Unauthorized' });
  try {
    const body = await readBody(req);
    const col = await licenses();

    // Retry on the rare key collision.
    let key;
    for (let attempt = 0; attempt < 5; attempt++) {
      key = genKey();
      try {
        await col.insertOne({
          key,
          account_id: null,
          status: 'active',
          buyer_name: body.buyer_name || '',
          buyer_email: body.buyer_email || '',
          buyer_mobile: body.buyer_mobile || '',
          expiry: body.expiry ? new Date(body.expiry) : null,
          created_at: new Date()
        });
        return send(res, 200, { ok: true, license_key: key });
      } catch (e) {
        if (e && e.code === 11000) continue; // duplicate key, retry
        throw e;
      }
    }
    return send(res, 500, { ok: false, error: 'Could not generate a unique key' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
}
