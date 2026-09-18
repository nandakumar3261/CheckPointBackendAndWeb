/**
 * Calls to the Express + MongoDB backend (see server.js, routes/auth.js,
 * routes/users.js). Everything else in the app still reads from MOCK in
 * data.js - only auth and user/guard management go through here.
 */

/**
 * Reads a fetch Response as JSON, but fails with a clear error instead of
 * a cryptic "Unexpected token '<'..." if the server returned HTML (e.g. an
 * unmatched route, a proxy error page, or the server needing a restart
 * after a code change) instead of JSON.
 */
async function readJsonResponse(res) {
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(
      `Server returned a non-JSON response (HTTP ${res.status}). This usually means the API route ` +
      `wasn't found or the server needs restarting. Response started with: "${snippet}"`
    );
  }

  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(body.error || `Request failed (HTTP ${res.status}).`);
  }
  return body;
}

async function loginViaApi(roll_no, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no, password }),
  });
  return readJsonResponse(res); // { roll_no, first_name, designation, mobile, role }
}

async function fetchUsersViaApi({ role, search, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (search) params.set('search', search);
  params.set('page', page);
  params.set('limit', limit);

  const res = await fetch(`/api/users?${params.toString()}`);
  return readJsonResponse(res); // { data, total, page, limit, totalPages }
}

async function addUserViaApi(payload) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res);
}

async function bulkAddUsersViaApi(users) {
  const res = await fetch('/api/users/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users }),
  });
  return readJsonResponse(res); // { insertedCount, skippedCount, results }
}

async function updateUserViaApi(id, payload) {
  const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res);
}

async function toggleBlockUserViaApi(id) {
  const res = await fetch(`/api/users/${encodeURIComponent(id)}/toggle-block`, { method: 'PATCH' });
  return readJsonResponse(res); // { _id, roll_no, blocked }
}

async function deleteUserViaApi(id) {
  const res = await fetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return readJsonResponse(res);
}

/**
 * Duty places (see routes/dutyPlaces.js, models/DutyPlace.js).
 */

async function fetchDutyPlacesViaApi({ search, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('page', page);
  params.set('limit', limit);

  const res = await fetch(`/api/duty-places?${params.toString()}`);
  return readJsonResponse(res); // { data, total, page, limit, totalPages }
}

async function fetchDutyPlaceOptionsViaApi() {
  const res = await fetch('/api/duty-places/options');
  return readJsonResponse(res); // { data }
}

async function addDutyPlaceViaApi(payload) {
  const res = await fetch('/api/duty-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res);
}

async function addSubPlacesViaApi(id, subPlaces) {
  const res = await fetch(`/api/duty-places/${encodeURIComponent(id)}/sub-places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subPlaces }),
  });
  return readJsonResponse(res);
}

async function updateDutyPlaceViaApi(id, payload) {
  const res = await fetch(`/api/duty-places/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res);
}

async function deleteDutyPlaceViaApi(id) {
  const res = await fetch(`/api/duty-places/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return readJsonResponse(res);
}

/**
 * Duty assignments (see routes/dutyAssignments.js, models/DutyAssignment.js).
 */

async function fetchDutyAssignmentsViaApi({ search, date, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (date) params.set('date', date);
  params.set('page', page);
  params.set('limit', limit);

  const res = await fetch(`/api/duty-assignments?${params.toString()}`);
  return readJsonResponse(res); // { data, total, page, limit, totalPages }
}

async function bulkAssignDutiesViaApi(payload) {
  const res = await fetch('/api/duty-assignments/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res); // { insertedCount, skippedCount, results }
}

async function updateDutyAssignmentViaApi(id, payload) {
  const res = await fetch(`/api/duty-assignments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(res);
}

async function deleteDutyAssignmentViaApi(id) {
  const res = await fetch(`/api/duty-assignments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return readJsonResponse(res);
}
