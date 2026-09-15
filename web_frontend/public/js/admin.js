const user = requireRole('admin');

const titles = {
  home: 'Home',
  scanQr: 'Scan QR Code',
  getQrData: 'Get QR Code Data',
  uploadImages: 'Upload Images',
  getUploadedImages: 'Get Uploaded Images',
  addSecurity: 'Add Security',
  getSecurityData: 'Get Security Data',
  addDutyPlaces: 'Add Duty Places',
  assignDuty: 'Assign Duty to Security Guard',
  showAssignedDuties: 'Show Assigned Duties List',
  deleteAssignDuty: 'Delete Assign Duty Employee',
  dutyFinishedStatus: 'Duty Finished Status',
  profile: 'Update Profile Pic',
  contact: 'Contact Us',
};

document.getElementById('whoName').textContent = user ? user.first_name : '';
document.getElementById('avatarInitial').textContent = user ? user.first_name.charAt(0) : '';

document.querySelectorAll('.nav-link[data-section]').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav-link[data-section]').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    render(el.dataset.section);
    document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

function render(section) {
  document.getElementById('pageTitle').textContent = titles[section];
  document.getElementById('content').innerHTML = renderers[section]();
  attachHandlers(section);
}

function sectionHead(title, sub) {
  return `<div class="section-head"><h2>${title}</h2><p>${sub}</p></div>`;
}

const renderers = {
  home: () => `
    ${sectionHead('Welcome back, ' + user.first_name.split(' ')[0], user.designation + ' • Roll No ' + user.roll_no)}
    <div class="grid-stats">
      <div class="stat-card"><div class="num">${MOCK.guards.length}</div><div class="label">Guards registered</div></div>
      <div class="stat-card"><div class="num">${MOCK.dutyPlaces.length}</div><div class="label">Duty locations</div></div>
      <div class="stat-card"><div class="num">${MOCK.assignments.length}</div><div class="label">Active assignments</div></div>
      <div class="stat-card"><div class="num">${MOCK.scans.length}</div><div class="label">QR scans today</div></div>
    </div>
    <div class="card">
      <div class="card-title">Recent QR scans</div>
      <table>
        <thead><tr><th>Guard</th><th>Place</th><th>Time</th></tr></thead>
        <tbody>
          ${MOCK.scans.map(s => `<tr><td>${s.guardLabel}</td><td>${s.scannedPlace}</td><td>${s.timestamp}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `,

  scanQr: () => `
    ${sectionHead('Scan QR Code', 'Scanning is only accepted between 6:00 PM – 6:00 AM, matching the original app rule.')}
    <div class="card" style="max-width:420px; text-align:center;">
      <div style="font-size:46px; margin-bottom:10px;">▦</div>
      <button class="btn btn-primary" id="simulateScanBtn" style="width:auto; padding:12px 24px;">Scan QR Code</button>
      <div id="scanResult" style="margin-top:16px;"></div>
    </div>
  `,

  getQrData: () => `
    ${sectionHead('Get QR Code Data', 'Attendance scans recorded by guards, grouped by duty date range.')}
    <div class="card">
      <table>
        <thead><tr><th>Guard</th><th>Scanned Place</th><th>Timestamp</th><th>Date Range</th></tr></thead>
        <tbody>
          ${MOCK.scans.map(s => `<tr><td>${s.guardLabel}</td><td>${s.scannedPlace}</td><td>${s.timestamp}</td><td>${s.dateRange}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `,

  uploadImages: () => `
    ${sectionHead('Upload Images', 'Attach a site-visit photo. In production this uploads to cloud storage.')}
    <div class="card" style="max-width:420px;">
      <div class="image-tile" style="margin-bottom:14px;"><div class="ph" style="height:160px;">🖼</div></div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-outline" id="pickImgBtn" style="flex:1;">Pick Image</button>
        <button class="btn btn-primary" id="uploadImgBtn" style="flex:1;" disabled>Upload</button>
      </div>
    </div>
  `,

  getUploadedImages: () => `
    ${sectionHead('Get Uploaded Images', 'Site-visit photo evidence submitted by guards.')}
    <div class="image-grid">
      ${MOCK.uploadedImages.map(i => `
        <div class="image-tile">
          <div class="ph">🖼</div>
          <div class="meta"><b>${i.guardLabel}</b><span>${i.place} • ${i.timestamp}</span></div>
        </div>`).join('')}
    </div>
  `,

  addSecurity: () => `
    ${sectionHead('Add Security', 'Register a new account. Saved to MongoDB (the same "users" collection used for login).')}
    <div class="two-col">
      <div class="card">
        <div class="card-title">New account</div>
        <form id="addGuardForm">
          <div class="form-grid">
            <div class="field"><label>Full name</label><input required name="first_name" /></div>
            <div class="field"><label>Roll No</label><input required name="roll_no" /></div>
            <div class="field"><label>Password</label><input required type="text" name="password" /></div>
            <div class="field">
              <label>Role</label>
              <select name="role" required>
                <option value="security" selected>Security Guard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="field"><label>Mobile</label><input required name="mobile" /></div>
            <div class="field"><label>Designation</label><input name="designation" placeholder="Security Guard" /></div>
          </div>
          <div class="error-text" id="addGuardError" style="margin-bottom:10px;"></div>
          <button class="btn btn-primary" style="width:auto; padding:10px 22px;" type="submit">Add Account</button>
        </form>
      </div>
      <div class="card">
        <div class="card-title">Added this session</div>
        <div id="addedGuardsList"><p style="color:var(--ink-500); font-size:13px;">None yet</p></div>
      </div>
    </div>
  `,

  getSecurityData: () => `
    ${sectionHead('Get Security Data', 'All registered accounts, read live from MongoDB.')}
    <div class="card">
      <div id="securityDataTableWrap"><p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p></div>
    </div>
  `,

  addDutyPlaces: () => `
    ${sectionHead('Add Duty Places', 'A main place (site) contains one or more sub-places, each with its own QR code.')}
    <div class="two-col">
      <div class="card">
        <div class="card-title">New duty place</div>
        <div class="field"><label>Main place</label><input id="mainPlaceInput" placeholder="e.g. North Campus" /></div>
        <div class="field" style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1;"><label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">Sub place</label><input id="subPlaceInput" placeholder="e.g. Gate C" /></div>
          <button class="btn btn-outline" id="addSubPlaceBtn">+</button>
        </div>
        <div id="pendingSubPlaces" style="margin:10px 0;"></div>
        <button class="btn btn-primary" id="saveDutyPlaceBtn" style="width:auto; padding:10px 22px;">Save Duty Place</button>
      </div>
      <div class="card">
        <div class="card-title">Existing duty places</div>
        ${MOCK.dutyPlaces.map(p => `
          <div style="margin-bottom:14px;">
            <b style="font-size:13.5px;">${p.mainPlace}</b><br>
            ${p.subPlaces.map(s => `<span class="chip">${s}</span>`).join('')}
          </div>`).join('')}
      </div>
    </div>
  `,

  assignDuty: () => `
    ${sectionHead('Assign Duty to Security Guard', 'Pick a guard, a date, a site, and the sub-places they will cover.')}
    <div class="card" style="max-width:520px;">
      <div class="field">
        <label>Security guard</label>
        <select id="assignGuard"><option value="">Select guard</option>${MOCK.guards.map(g => `<option value="${g.name} ( ${g.empId} )">${g.name} ( ${g.empId} )</option>`).join('')}</select>
      </div>
      <div class="field"><label>Duty date</label><input type="date" id="assignDate" /></div>
      <div class="field">
        <label>Duty place</label>
        <select id="assignPlace"><option value="">Select place</option>${MOCK.dutyPlaces.map((p, i) => `<option value="${i}">${p.mainPlace}</option>`).join('')}</select>
      </div>
      <div class="field" id="assignSubPlacesWrap" style="display:none;">
        <label>Sub places</label>
        <div id="assignSubPlaces"></div>
      </div>
      <button class="btn btn-primary" id="assignSubmitBtn" style="width:auto; padding:10px 22px;">Assign Duty</button>
    </div>
  `,

  showAssignedDuties: () => `
    ${sectionHead('Show Assigned Duties List', 'All duty assignments currently scheduled.')}
    ${MOCK.assignments.map(a => `
      <div class="card">
        <span class="badge badge-amber">${a.dateRange}</span>
        <div style="margin-top:10px; font-weight:700;">${a.guardLabel}</div>
        <div style="color:var(--ink-300); font-size:13.5px;">${a.mainPlace}</div>
        <div style="margin-top:8px;">${a.subPlaces.map(s => `<span class="chip">${s}</span>`).join('')}</div>
      </div>`).join('')}
  `,

  deleteAssignDuty: () => `
    ${sectionHead('Delete Assign Duty Employee', 'Remove a guard from a scheduled duty assignment.')}
    <div id="deleteAssignList">
      ${MOCK.assignments.map((a, i) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center;" data-idx="${i}">
          <div>
            <div style="font-weight:700;">${a.guardLabel}</div>
            <div style="color:var(--ink-500); font-size:12.5px;">${a.mainPlace} • ${a.dateRange}</div>
          </div>
          <button class="icon-btn removeAssignBtn" data-idx="${i}">Remove</button>
        </div>`).join('')}
    </div>
  `,

  dutyFinishedStatus: () => `
    ${sectionHead('Duty Finished Status', 'Progress of each guard against their assigned sub-places.')}
    <div style="margin-bottom:14px;"><button class="btn btn-outline" id="exportPdfBtn">Export PDF</button></div>
    ${MOCK.dutyStatus.map(s => {
      const complete = s.scanned >= s.total;
      const pct = Math.round((s.scanned / s.total) * 100);
      return `
      <div class="card">
        <div style="display:flex; justify-content:space-between;">
          <b>${s.guardLabel}</b>
          <span class="badge ${complete ? 'badge-success' : 'badge-danger'}">${complete ? 'Complete' : 'Pending'}</span>
        </div>
        <div style="color:var(--ink-500); font-size:13px;">${s.place}</div>
        <div class="progress-track"><div class="progress-fill ${complete ? 'complete' : ''}" style="width:${pct}%;"></div></div>
        <div style="font-size:11.5px; color:var(--ink-500);">${s.scanned} / ${s.total} sub-places scanned • ${s.dateRange}</div>
      </div>`;
    }).join('')}
  `,

  profile: () => `
    ${sectionHead('Update Profile Pic', 'View your profile details and update your photo.')}
    <div class="card" style="max-width:420px; text-align:center;">
      <div class="avatar" style="width:80px; height:80px; font-size:28px; margin:0 auto 16px;">${user.first_name.charAt(0)}</div>
      <button class="btn btn-outline" style="width:auto; padding:8px 18px; margin-bottom:18px;">Change Photo</button>
      <table style="text-align:left;">
        <tr><td style="color:var(--ink-500);">Name</td><td>${user.first_name}</td></tr>
        <tr><td style="color:var(--ink-500);">Designation</td><td>${user.designation}</td></tr>
        <tr><td style="color:var(--ink-500);">Roll No</td><td>${user.roll_no}</td></tr>
        <tr><td style="color:var(--ink-500);">Mobile</td><td>${user.mobile}</td></tr>
      </table>
    </div>
  `,

  contact: () => `
    ${sectionHead('Contact Us', 'Reach the support team for help with the app.')}
    <div class="card" style="max-width:420px;">
      <p>support@adityasecurityguard.com</p>
      <p>+91 98765 43210</p>
      <p>Aditya Towers, Hyderabad, India</p>
    </div>
  `,
};

function attachHandlers(section) {
  if (section === 'scanQr') {
    document.getElementById('simulateScanBtn').addEventListener('click', () => {
      const place = MOCK.dutyPlaces[0].subPlaces[0];
      document.getElementById('scanResult').innerHTML = `
        <div style="background:var(--navy-800); padding:12px; border-radius:8px; margin-bottom:10px;">Scanned data: <b>${place}</b></div>
        <button class="btn btn-primary" style="width:auto; padding:8px 20px;" onclick="alert('Data saved successfully (simulated)')">Submit</button>`;
    });
  }

  if (section === 'uploadImages') {
    document.getElementById('pickImgBtn').addEventListener('click', () => {
      document.querySelector('.ph').textContent = '✅';
      document.getElementById('uploadImgBtn').disabled = false;
    });
    document.getElementById('uploadImgBtn').addEventListener('click', () => alert('Image uploaded (simulated)'));
  }

  if (section === 'addSecurity') {
    const added = [];
    document.getElementById('addGuardForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('addGuardError');
      errBox.textContent = '';
      const f = new FormData(e.target);
      const payload = {
        first_name: f.get('first_name'),
        roll_no: f.get('roll_no'),
        password: f.get('password'),
        role: f.get('role'),
        mobile: f.get('mobile'),
        designation: f.get('designation') || 'Security Guard',
      };
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const saved = await addUserViaApi(payload);
        added.unshift(saved);
        document.getElementById('addedGuardsList').innerHTML = added.map(g => `<div style="padding:8px 0; border-bottom:1px solid var(--navy-line); font-size:13px;"><b>${g.first_name}</b> <span class="badge badge-amber">${g.role}</span><br><span style="color:var(--ink-500);">${g.roll_no} • ${g.mobile} • ${g.designation}</span></div>`).join('');
        e.target.reset();
      } catch (err) {
        errBox.textContent = err.message;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  if (section === 'getSecurityData') {
    fetchUsersViaApi()
      .then(users => {
        const wrap = document.getElementById('securityDataTableWrap');
        if (!users.length) {
          wrap.innerHTML = `<p style="color:var(--ink-500); font-size:13px;">No accounts in MongoDB yet. Create the first admin in mongosh (see README.md) or add one via "Add Security".</p>`;
          return;
        }
        wrap.innerHTML = `
          <table>
            <thead><tr><th>Name</th><th>Roll No</th><th>Role</th><th>Mobile</th><th>Designation</th></tr></thead>
            <tbody>
              ${users.map(u => `<tr><td>${u.first_name}</td><td>${u.roll_no}</td><td><span class="badge ${u.role === 'admin' ? 'badge-amber' : 'badge-success'}">${u.role}</span></td><td>${u.mobile}</td><td>${u.designation}</td></tr>`).join('')}
            </tbody>
          </table>`;
      })
      .catch(err => {
        document.getElementById('securityDataTableWrap').innerHTML = `<p style="color:var(--danger); font-size:13px;">Could not load from MongoDB: ${err.message}</p>`;
      });
  }

  if (section === 'addDutyPlaces') {
    const pending = [];
    const renderPending = () => {
      document.getElementById('pendingSubPlaces').innerHTML = pending.map(s => `<span class="chip">${s}</span>`).join('');
    };
    document.getElementById('addSubPlaceBtn').addEventListener('click', () => {
      const input = document.getElementById('subPlaceInput');
      if (input.value.trim()) { pending.push(input.value.trim()); input.value = ''; renderPending(); }
    });
    document.getElementById('saveDutyPlaceBtn').addEventListener('click', () => {
      const main = document.getElementById('mainPlaceInput').value.trim();
      if (!main || pending.length === 0) { alert('Enter a main place and at least one sub place'); return; }
      alert('Duty place saved (local demo list)');
      document.getElementById('mainPlaceInput').value = '';
      pending.length = 0;
      renderPending();
    });
  }

  if (section === 'assignDuty') {
    document.getElementById('assignPlace').addEventListener('change', (e) => {
      const wrap = document.getElementById('assignSubPlacesWrap');
      const box = document.getElementById('assignSubPlaces');
      if (e.target.value === '') { wrap.style.display = 'none'; return; }
      const place = MOCK.dutyPlaces[e.target.value];
      box.innerHTML = place.subPlaces.map(s => `<label style="display:inline-flex; align-items:center; gap:6px; margin:4px 10px 4px 0; font-size:13px;"><input type="checkbox" value="${s}"> ${s}</label>`).join('');
      wrap.style.display = 'block';
    });
    document.getElementById('assignSubmitBtn').addEventListener('click', () => {
      const guard = document.getElementById('assignGuard').value;
      const date = document.getElementById('assignDate').value;
      const placeIdx = document.getElementById('assignPlace').value;
      const checked = Array.from(document.querySelectorAll('#assignSubPlaces input:checked')).map(c => c.value);
      if (!guard || !date || placeIdx === '' || checked.length === 0) { alert('Please complete all fields'); return; }
      alert(`Assigned ${guard} to ${MOCK.dutyPlaces[placeIdx].mainPlace} (${checked.length} sub-places)`);
    });
  }

  if (section === 'deleteAssignDuty') {
    document.querySelectorAll('.removeAssignBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Remove this assignment?')) {
          e.target.closest('.card').remove();
        }
      });
    });
  }

  if (section === 'dutyFinishedStatus') {
    document.getElementById('exportPdfBtn').addEventListener('click', () => alert('PDF export simulated'));
  }
}

render('home');
