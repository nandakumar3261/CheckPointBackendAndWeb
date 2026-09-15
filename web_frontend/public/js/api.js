/**
 * Calls to the Express + MongoDB backend (see server.js, routes/auth.js,
 * routes/users.js). Everything else in the app still reads from MOCK in
 * data.js - only auth and user/guard management go through here.
 */

async function loginViaApi(roll_no, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roll_no, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Login failed.');
  }
  return body; // { roll_no, first_name, designation, mobile, role }
}

async function fetchUsersViaApi(role) {
  const qs = role ? `?role=${encodeURIComponent(role)}` : '';
  const res = await fetch(`/api/users${qs}`);
  if (!res.ok) throw new Error('Failed to load users.');
  return res.json();
}

async function addUserViaApi(payload) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to add user.');
  }
  return body;
}
