// /api/purchases  (admin)  header: x-admin-secret
//   GET                -> list recent purchases (WITHOUT the heavy proof file)
//   GET ?id=<id>       -> one purchase INCLUDING the proof (data URL) to view the receipt
//   POST { id, status }-> update a purchase's status (e.g. "verified", "contacted", "shipped")
import { ObjectId } from 'mongodb';
import { purchases } from './_db.js';
import { send, readBody, isAdmin } from './_util.js';

const STATUSES = ['pending', 'verified', 'contacted', 'shipped', 'rejected'];

export default async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { ok: false, error: 'Unauthorized' });
  try {
    const col = await purchases();

    if (req.method === 'GET') {
      const id = req.query && req.query.id;
      if (id) {
        let _id;
        try { _id = new ObjectId(String(id)); } catch { return send(res, 400, { ok: false, error: 'Bad id' }); }
        const doc = await col.findOne({ _id });
        if (!doc) return send(res, 404, { ok: false, error: 'Not found' });
        // Full record incl. the proof data URL so the panel can show the receipt.
        return send(res, 200, {
          ok: true,
          purchase: {
            id: String(doc._id),
            name: doc.name, email: doc.email, mobile: doc.mobile,
            filename: doc.filename, contentType: doc.contentType, size: doc.size,
            proof: doc.proof || null,
            status: doc.status || 'pending',
            created_at: doc.created_at,
          },
        });
      }
      // List (light — no proof payload, so it stays fast).
      const docs = await col.find({}, {
        projection: { proof: 0 },
      }).sort({ created_at: -1 }).limit(200).toArray();
      const list = docs.map((d) => ({
        id: String(d._id),
        name: d.name, email: d.email, mobile: d.mobile,
        filename: d.filename, contentType: d.contentType, size: d.size,
        status: d.status || 'pending',
        created_at: d.created_at,
      }));
      return send(res, 200, { ok: true, count: list.length, purchases: list });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      let _id;
      try { _id = new ObjectId(String(body.id)); } catch { return send(res, 400, { ok: false, error: 'Bad id' }); }
      const status = STATUSES.includes(body.status) ? body.status : null;
      if (!status) return send(res, 400, { ok: false, error: 'status must be one of ' + STATUSES.join(', ') });
      const r = await col.updateOne({ _id }, { $set: { status, status_at: new Date() } });
      if (!r.matchedCount) return send(res, 404, { ok: false, error: 'Not found' });
      return send(res, 200, { ok: true, id: String(_id), status });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
}
