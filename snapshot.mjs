// Pulse — snapshot sync function.
// GET  /api/snapshot/:userId    -> latest snapshot for that user (or 404)
// POST /api/snapshot            -> { userId, writeToken, snapshot }
//   First write claims the writeToken; subsequent writes must match it.
//
// Storage: Netlify Blobs key = `u/<userId>` -> { writeToken, snapshot, updatedAt }

import { getStore } from '@netlify/blobs';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors, ...extra },
  });
}

const SAFE_ID = /^[a-zA-Z0-9_-]{4,64}$/;
const SAFE_TOKEN = /^[a-zA-Z0-9_-]{8,128}$/;

// ~1 MB cap on snapshots — plenty for years of logs, low abuse risk.
const MAX_SNAPSHOT_BYTES = 1_000_000;

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const store = getStore('pulse-snapshots');
  const url = new URL(req.url);

  // Path could be:
  //   /api/snapshot                       (POST upload)
  //   /api/snapshot/<userId>              (GET fetch)
  //   /.netlify/functions/snapshot/...    (raw)
  const parts = url.pathname.split('/').filter(Boolean);
  // strip leading "api"/"snapshot" or ".netlify/functions/snapshot"
  let userId = null;
  const snapIdx = parts.lastIndexOf('snapshot');
  if (snapIdx >= 0 && parts.length > snapIdx + 1) userId = parts[snapIdx + 1];

  if (req.method === 'GET') {
    if (!userId || !SAFE_ID.test(userId)) {
      return jsonResponse({ error: 'invalid userId' }, 400);
    }
    const data = await store.get(`u/${userId}`, { type: 'json' });
    if (!data) return jsonResponse({ error: 'not found' }, 404);
    // Never leak the writeToken to readers.
    return jsonResponse({ snapshot: data.snapshot, updatedAt: data.updatedAt });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid json' }, 400);
    }
    const { userId: uid, writeToken, snapshot } = body || {};
    if (!uid || !SAFE_ID.test(uid)) return jsonResponse({ error: 'invalid userId' }, 400);
    if (!writeToken || !SAFE_TOKEN.test(writeToken)) return jsonResponse({ error: 'invalid writeToken' }, 400);
    if (!snapshot || typeof snapshot !== 'object') return jsonResponse({ error: 'missing snapshot' }, 400);

    const serialized = JSON.stringify(snapshot);
    if (serialized.length > MAX_SNAPSHOT_BYTES) {
      return jsonResponse({ error: 'snapshot too large' }, 413);
    }

    const existing = await store.get(`u/${uid}`, { type: 'json' });
    if (existing && existing.writeToken && existing.writeToken !== writeToken) {
      return jsonResponse({ error: 'token mismatch' }, 403);
    }

    const record = {
      writeToken,
      snapshot,
      updatedAt: new Date().toISOString(),
    };
    await store.setJSON(`u/${uid}`, record);
    return jsonResponse({ ok: true, updatedAt: record.updatedAt });
  }

  return jsonResponse({ error: 'method not allowed' }, 405);
};

export const config = {
  path: ['/api/snapshot', '/api/snapshot/:userId'],
};
