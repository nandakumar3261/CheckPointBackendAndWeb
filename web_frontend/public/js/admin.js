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
  dutyStatus: 'Duty Status',
  profile: 'Update Profile Pic',
  contact: 'Contact Us',
};

// Formats an ISO date string (e.g. a MongoDB createdAt) as a readable
// "DD-MM-YYYY, hh:mm" local date + time, used wherever we show an "Added On".
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "YYYY-MM-DD" for today, in the browser's local time - used as the `min`
// on duty-date pickers so past dates can't be chosen, and as the base for
// completed/upcoming comparisons.
function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// A duty is "completed" once its dutyDate is strictly before today - the
// overnight shift has already happened, so it's locked from further edits.
function isPastDutyDate(dutyDateIso) {
  if (!dutyDateIso) return false;
  const d = new Date(dutyDateIso);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

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

function openModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('modalBox').innerHTML = '';
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});

const renderers = {
  home: () => `
    ${sectionHead('Welcome back, ' + user.first_name.split(' ')[0], user.designation + ' • Roll No ' + user.roll_no)}
    <div class="grid-stats">
      <div class="stat-card"><div class="num">${MOCK.guards.length}</div><div class="label">Guards registered</div></div>
      <div class="stat-card"><div class="num">${MOCK.dutyPlaces.length}</div><div class="label">Duty locations</div></div>
      <div class="stat-card"><div class="num" id="activeAssignmentsStat">…</div><div class="label">Active assignments</div></div>
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
    ${sectionHead('Add Security', 'Register a new account, one at a time or in bulk via CSV. Saved to MongoDB (the same "users" collection used for login).')}
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

    <div class="card">
      <div class="card-title">Bulk upload (CSV)</div>
      <p style="color:var(--ink-500); font-size:12.5px; margin-bottom:4px;">
        Columns: <code>roll_no, password, first_name, designation, mobile, role</code> — role must be
        <code>admin</code> or <code>security</code>. First row must be the header row.
      </p>
      <div class="bulk-upload-box">
        <div class="row">
          <button class="btn btn-outline" id="downloadTemplateBtn" type="button">Download CSV Template</button>
          <input type="file" id="csvFileInput" accept=".csv,text/csv" />
          <button class="btn btn-primary" id="uploadCsvBtn" type="button" style="width:auto; padding:10px 18px;" disabled>Upload CSV</button>
        </div>
        <div id="bulkUploadStatus" style="margin-top:10px; font-size:12.5px; color:var(--ink-500);"></div>
        <div id="bulkResultList" class="bulk-result-list"></div>
      </div>
    </div>
  `,

  getSecurityData: () => `
    ${sectionHead('Get Security Data', 'All registered accounts, read live from MongoDB.')}
    <div class="card">
      <div class="data-toolbar">
        <div class="search-field">
          <input type="text" id="securitySearchInput" placeholder="Search by name, roll no, mobile, or designation..." />
        </div>
        <div class="toolbar-right">
          <div class="page-size-field">
            <label for="securityPageSizeSelect">Rows per page</label>
            <select id="securityPageSizeSelect">
              <option value="10" selected>10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <button class="btn btn-outline" id="downloadSecurityBtn" type="button">⬇ Download Excel</button>
        </div>
      </div>
      <div id="securityDataTableWrap"><p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p></div>
      <div class="pagination-bar">
        <div class="page-info" id="securityPageInfo"></div>
        <div class="page-controls">
          <button class="btn btn-outline" id="securityPrevBtn" style="padding:8px 16px;" disabled>Previous</button>
          <button class="btn btn-outline" id="securityNextBtn" style="padding:8px 16px;">Next</button>
        </div>
      </div>
    </div>
  `,

  addDutyPlaces: () => `
    ${sectionHead('Add Duty Places', 'A main place (site) contains one or more sub-places, each with its own QR code.')}

    <div class="tabs" id="dutyPlaceTabs">
      <button class="tab-btn active" data-tab="newPlace" type="button">New Place</button>
      <button class="tab-btn" data-tab="addSubPlaces" type="button">Add Sub Places</button>
      <button class="tab-btn" data-tab="existingPlaces" type="button">Existing Duty Places</button>
    </div>

    <div class="tab-panel" id="tab-newPlace">
      <div class="card" style="max-width:520px;">
        <div class="card-title">New duty place</div>
        <div class="field"><label>Main place</label><input id="mainPlaceInput" placeholder="e.g. North Campus" /></div>
        <div class="field" style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1;"><label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">Sub place</label><input id="subPlaceInput" placeholder="e.g. Gate C" /></div>
          <button class="btn btn-outline" id="addSubPlaceBtn" type="button">+</button>
        </div>
        <div id="pendingSubPlaces" style="margin:10px 0;"></div>
        <div class="error-text" id="newPlaceError"></div>
        <button class="btn btn-primary" id="saveDutyPlaceBtn" style="width:auto; padding:10px 22px;">Save Duty Place</button>
      </div>
    </div>

    <div class="tab-panel" id="tab-addSubPlaces" style="display:none;">
      <div class="card" style="max-width:520px;">
        <div class="card-title">Add sub places to an existing main place</div>
        <div class="field">
          <label>Main place</label>
          <select id="subPlacesMainSelect"><option value="">Select a main place</option></select>
        </div>
        <div class="field">
          <label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">Existing sub places</label>
          <div id="existingSubPlacesChips"><span style="color:var(--ink-500); font-size:12.5px;">Select a main place above</span></div>
        </div>
        <div class="field" style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1;"><label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">New sub place</label><input id="newSubPlaceInput" placeholder="e.g. Gate D" disabled /></div>
          <button class="btn btn-outline" id="addNewSubPlaceBtn" type="button" disabled>+</button>
        </div>
        <div id="pendingNewSubPlaces" style="margin:10px 0;"></div>
        <div class="error-text" id="addSubPlacesError"></div>
        <button class="btn btn-primary" id="saveSubPlacesBtn" style="width:auto; padding:10px 22px;" disabled>Add Sub Places</button>
      </div>
    </div>

    <div class="tab-panel" id="tab-existingPlaces" style="display:none;">
      <div class="card">
        <div class="data-toolbar">
          <div class="search-field">
            <input type="text" id="dutyPlaceSearchInput" placeholder="Search by main place or sub place..." />
          </div>
          <div class="toolbar-right">
            <div class="page-size-field">
              <label for="dutyPlacePageSizeSelect">Rows per page</label>
              <select id="dutyPlacePageSizeSelect">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <button class="btn btn-outline" id="downloadDutyPlacesBtn" type="button">⬇ Download Excel</button>
          </div>
        </div>
        <div id="dutyPlacesTableWrap"><p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p></div>
        <div class="pagination-bar">
          <div class="page-info" id="dutyPlacesPageInfo"></div>
          <div class="page-controls">
            <button class="btn btn-outline" id="dutyPlacesPrevBtn" style="padding:8px 16px;" disabled>Previous</button>
            <button class="btn btn-outline" id="dutyPlacesNextBtn" style="padding:8px 16px;">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,

  dutyStatus: () => `
    ${sectionHead('Duty Status', 'Assign duty to guards, review what is scheduled, and track completion.')}

    <div class="tabs" id="dutyStatusTabs">
      <button class="tab-btn active" data-tab="assignDuty" type="button">Assign Duty to Guard</button>
      <button class="tab-btn" data-tab="showAssigned" type="button">Show Assigned Duties</button>
      <button class="tab-btn" data-tab="finishedStatus" type="button">Duty Finished Status</button>
    </div>

    <div class="tab-panel" id="tab-assignDuty">
      <div class="card" style="max-width:280px;">
        <div class="field" style="margin-bottom:0;"><label>Duty date</label><input type="date" id="assignDutyDate" /></div>
      </div>

      <div class="assign-board">
        <div class="card assign-col">
          <div class="card-title">Main Places</div>
          <input type="text" id="assignPlacesSearch" class="mini-search" placeholder="Search main places..." />
          <div class="assign-hint">Drag a place into the Duty Assignments column</div>
          <div id="assignPlacesList" class="assign-list"><p style="color:var(--ink-500); font-size:13px;">Loading...</p></div>
        </div>
        <div class="card assign-col">
          <div class="card-title">Guards</div>
          <input type="text" id="assignGuardsSearch" class="mini-search" placeholder="Search guards..." />
          <div class="assign-hint">Drag a guard onto a duty card to assign it</div>
          <div id="assignGuardsList" class="assign-list"><p style="color:var(--ink-500); font-size:13px;">Loading...</p></div>
        </div>
        <div class="card assign-col">
          <div class="card-title">Duty Assignments</div>
          <div class="assign-hint">Drop a main place here, then drop a guard onto its card. Pick a duty date above to see what's already assigned for that day.</div>
          <div id="assignDropZone" class="assign-list assign-dropzone"></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <button class="btn btn-outline" id="previewAssignBtn" type="button" style="width:auto; padding:10px 22px;">Show Preview</button>
        <div id="assignPreviewWrap"></div>
      </div>
    </div>

    <div class="tab-panel" id="tab-showAssigned" style="display:none;">
      <div class="card">
        <div class="data-toolbar">
          <div class="search-field">
            <input type="text" id="assignedSearchInput" placeholder="Search by guard or main place..." />
          </div>
          <div class="toolbar-right">
            <input type="date" id="assignedDateFilter" title="Filter by duty date" />
            <span class="clear-date-link" id="clearAssignedDateBtn">Clear date</span>
            <div class="page-size-field">
              <label for="assignedPageSizeSelect">Rows per page</label>
              <select id="assignedPageSizeSelect">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <button class="btn btn-outline" id="downloadAssignedPdfBtn" type="button">⬇ Download PDF</button>
          </div>
        </div>
        <div id="assignedTableWrap"><p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p></div>
        <div class="pagination-bar">
          <div class="page-info" id="assignedPageInfo"></div>
          <div class="page-controls">
            <button class="btn btn-outline" id="assignedPrevBtn" style="padding:8px 16px;" disabled>Previous</button>
            <button class="btn btn-outline" id="assignedNextBtn" style="padding:8px 16px;">Next</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-finishedStatus" style="display:none;">
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
    </div>
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
  if (section === 'home') {
    fetchDutyAssignmentsViaApi({ limit: 1 })
      .then(res => { document.getElementById('activeAssignmentsStat').textContent = res.total; })
      .catch(() => { document.getElementById('activeAssignmentsStat').textContent = '—'; });
  }

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

    // ---- CSV bulk upload ----
    document.getElementById('downloadTemplateBtn').addEventListener('click', downloadCsvTemplate);

    const fileInput = document.getElementById('csvFileInput');
    const uploadBtn = document.getElementById('uploadCsvBtn');
    const statusBox = document.getElementById('bulkUploadStatus');
    const resultList = document.getElementById('bulkResultList');
    let selectedFile = null;

    fileInput.addEventListener('change', (e) => {
      selectedFile = e.target.files[0] || null;
      uploadBtn.disabled = !selectedFile;
      statusBox.textContent = selectedFile ? `Selected: ${selectedFile.name}` : '';
      resultList.innerHTML = '';
    });

    uploadBtn.addEventListener('click', () => {
      if (!selectedFile) return;
      uploadBtn.disabled = true;
      statusBox.textContent = 'Reading file...';
      resultList.innerHTML = '';

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const rows = parseCsv(ev.target.result);
          if (!rows.length) {
            statusBox.textContent = 'No data rows found in that file.';
            return;
          }
          statusBox.textContent = `Uploading ${rows.length} row(s)...`;
          const result = await bulkAddUsersViaApi(rows);
          statusBox.innerHTML = `<span class="badge badge-success">${result.insertedCount} added</span> &nbsp; <span class="badge ${result.skippedCount ? 'badge-danger' : 'badge-amber'}">${result.skippedCount} skipped</span>`;
          const skipped = result.results.filter(r => r.status === 'skipped');
          resultList.innerHTML = skipped.length
            ? skipped.map(r => `<div class="row-item"><span>Row ${r.row} (${r.roll_no || '—'})</span><span style="color:var(--danger);">${r.reason}</span></div>`).join('')
            : '<div style="color:var(--ink-500); padding:6px 0;">No rows skipped.</div>';
        } catch (err) {
          statusBox.innerHTML = `<span style="color:var(--danger);">${err.message}</span>`;
        } finally {
          uploadBtn.disabled = false;
          fileInput.value = '';
          selectedFile = null;
        }
      };
      reader.readAsText(selectedFile);
    });
  }

  if (section === 'getSecurityData') {
    const state = { search: '', page: 1, limit: 10 };
    let currentRows = []; // cache of the currently-rendered page, for the edit modal

    const renderTable = (res) => {
      currentRows = res.data;
      const wrap = document.getElementById('securityDataTableWrap');
      if (!res.data.length) {
        wrap.innerHTML = `<p style="color:var(--ink-500); font-size:13px;">${state.search ? 'No matching accounts found.' : 'No accounts in MongoDB yet. Create the first admin in mongosh (see README.md) or add one via "Add Security".'}</p>`;
      } else {
        const startSerial = (res.page - 1) * res.limit;
        wrap.innerHTML = `
          <div class="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Roll No</th><th>Role</th><th>Mobile</th><th>Designation</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${res.data.map((u, i) => `
                  <tr data-id="${u._id}">
                    <td class="serial-col">${startSerial + i + 1}</td>
                    <td>${u.first_name}</td>
                    <td>${u.roll_no}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-amber' : 'badge-success'}">${u.role}</span></td>
                    <td>${u.mobile}</td>
                    <td>${u.designation}</td>
                    <td><span class="badge ${u.blocked ? 'badge-blocked' : 'badge-success'}">${u.blocked ? 'Blocked' : 'Active'}</span></td>
                    <td>
                      <div class="row-actions">
                        <button class="edit-btn" data-id="${u._id}" title="Edit">✏️</button>
                        <button class="${u.blocked ? 'unblock-btn' : 'block-btn'}" data-id="${u._id}" title="${u.blocked ? 'Unblock' : 'Block'}">${u.blocked ? '🔓' : '🚫'}</button>
                        <button class="delete-btn" data-id="${u._id}" title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
        wireRowActions();
      }
      const from = res.total === 0 ? 0 : (res.page - 1) * res.limit + 1;
      const to = Math.min(res.page * res.limit, res.total);
      document.getElementById('securityPageInfo').textContent = `Showing ${from}-${to} of ${res.total}`;
      document.getElementById('securityPrevBtn').disabled = res.page <= 1;
      document.getElementById('securityNextBtn').disabled = res.page >= res.totalPages;
    };

    const load = () => {
      document.getElementById('securityDataTableWrap').innerHTML = '<p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p>';
      fetchUsersViaApi({ search: state.search, page: state.page, limit: state.limit })
        .then(renderTable)
        .catch(err => {
          document.getElementById('securityDataTableWrap').innerHTML = `<p style="color:var(--danger); font-size:13px;">Could not load from MongoDB: ${err.message}</p>`;
        });
    };

    function wireRowActions() {
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
      });
      document.querySelectorAll('.block-btn, .unblock-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const u = currentRows.find(r => r._id === btn.dataset.id);
          const verb = u && u.blocked ? 'unblock' : 'block';
          if (!confirm(`Are you sure you want to ${verb} ${u ? u.first_name : 'this account'}?`)) return;
          try {
            await toggleBlockUserViaApi(btn.dataset.id);
            load();
          } catch (err) {
            alert(err.message);
          }
        });
      });
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const u = currentRows.find(r => r._id === btn.dataset.id);
          if (!confirm(`Delete ${u ? u.first_name : 'this account'} (${u ? u.roll_no : ''})? This cannot be undone.`)) return;
          try {
            await deleteUserViaApi(btn.dataset.id);
            load();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    }

    function openEditModal(id) {
      const u = currentRows.find(r => r._id === id);
      if (!u) return;
      openModal(`
        <h3>Edit account — ${u.roll_no}</h3>
        <form id="editUserForm">
          <div class="field"><label>Full name</label><input required name="first_name" value="${u.first_name}" /></div>
          <div class="field"><label>Designation</label><input name="designation" value="${u.designation}" /></div>
          <div class="field"><label>Mobile</label><input required name="mobile" value="${u.mobile}" /></div>
          <div class="field">
            <label>Role</label>
            <select name="role">
              <option value="security" ${u.role === 'security' ? 'selected' : ''}>Security Guard</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="field"><label>New password (leave blank to keep current)</label><input type="text" name="password" /></div>
          <div class="error-text" id="editUserError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="cancelEditBtn">Cancel</button>
            <button type="submit" class="btn btn-primary" style="width:auto; padding:10px 20px;">Save Changes</button>
          </div>
        </form>
      `);
      document.getElementById('cancelEditBtn').addEventListener('click', closeModal);
      document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const payload = {
          first_name: f.get('first_name'),
          designation: f.get('designation'),
          mobile: f.get('mobile'),
          role: f.get('role'),
        };
        const pwd = f.get('password');
        if (pwd && pwd.trim()) payload.password = pwd.trim();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          await updateUserViaApi(id, payload);
          closeModal();
          load();
        } catch (err) {
          document.getElementById('editUserError').textContent = err.message;
          submitBtn.disabled = false;
        }
      });
    }

    let searchTimer;
    document.getElementById('securitySearchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        load();
      }, 300);
    });

    document.getElementById('securityPageSizeSelect').addEventListener('change', (e) => {
      state.limit = parseInt(e.target.value, 10) || 10;
      state.page = 1;
      load();
    });

    document.getElementById('securityPrevBtn').addEventListener('click', () => {
      if (state.page > 1) { state.page -= 1; load(); }
    });
    document.getElementById('securityNextBtn').addEventListener('click', () => {
      state.page += 1;
      load();
    });

    document.getElementById('downloadSecurityBtn').addEventListener('click', async () => {
      const btn = document.getElementById('downloadSecurityBtn');
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Preparing...';
      try {
        const res = await fetchUsersViaApi({ search: state.search, page: 1, limit: 10000 });
        const rows = res.data.map((u, i) => ({
          '#': i + 1,
          'Name': u.first_name,
          'Roll No': u.roll_no,
          'Role': u.role,
          'Mobile': u.mobile,
          'Designation': u.designation,
          'Status': u.blocked ? 'Blocked' : 'Active',
          'Added On': formatDateTime(u.createdAt),
        }));
        exportRowsToExcel(rows, { filename: `security_data_${Date.now()}.xlsx`, sheetName: 'Security Data' });
      } catch (err) {
        alert('Could not export: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });

    load();
  }

  if (section === 'addDutyPlaces') {
    // ---------- Tab switching ----------
    const tabNames = ['newPlace', 'addSubPlaces', 'existingPlaces'];
    document.querySelectorAll('#dutyPlaceTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dutyPlaceTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabNames.forEach(t => {
          document.getElementById('tab-' + t).style.display = (t === btn.dataset.tab) ? 'block' : 'none';
        });
        if (btn.dataset.tab === 'addSubPlaces') loadMainPlaceOptions();
        if (btn.dataset.tab === 'existingPlaces') loadExistingPlaces();
      });
    });

    // Renders a list of pending chip strings into a container, each with a
    // small "x" to remove it before saving. Shared shape used by tab 1,
    // tab 2, and the "add sub place" quick-modal.
    function renderPendingChips(containerId, list, onRemove) {
      const box = document.getElementById(containerId);
      box.innerHTML = list.map((s, i) =>
        `<span class="chip">${s} <span class="chip-remove" data-i="${i}">✕</span></span>`).join('');
      box.querySelectorAll('.chip-remove').forEach(x => {
        x.addEventListener('click', () => { list.splice(parseInt(x.dataset.i, 10), 1); onRemove(); });
      });
    }

    // ---------- Tab 1: New Place ----------
    const pending = [];
    const renderPending = () => renderPendingChips('pendingSubPlaces', pending, renderPending);

    const addPendingFrom = (inputId, list, rerender) => {
      const input = document.getElementById(inputId);
      const val = input.value.trim();
      if (val && !list.some(p => p.toLowerCase() === val.toLowerCase())) {
        list.push(val);
        input.value = '';
        rerender();
      }
      input.focus();
    };

    document.getElementById('addSubPlaceBtn').addEventListener('click', () => addPendingFrom('subPlaceInput', pending, renderPending));
    document.getElementById('subPlaceInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('addSubPlaceBtn').click(); }
    });

    document.getElementById('saveDutyPlaceBtn').addEventListener('click', async () => {
      const errBox = document.getElementById('newPlaceError');
      errBox.textContent = '';
      const main = document.getElementById('mainPlaceInput').value.trim();
      if (!main || pending.length === 0) { errBox.textContent = 'Enter a main place and at least one sub place.'; return; }

      const btn = document.getElementById('saveDutyPlaceBtn');
      btn.disabled = true;
      try {
        await addDutyPlaceViaApi({ mainPlace: main, subPlaces: pending.slice() });
        document.getElementById('mainPlaceInput').value = '';
        pending.length = 0;
        renderPending();
        alert('Duty place saved.');
      } catch (err) {
        errBox.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    // ---------- Tab 2: Add Sub Places ----------
    let mainPlaceOptions = [];
    const pendingNew = [];
    const renderPendingNew = () => renderPendingChips('pendingNewSubPlaces', pendingNew, renderPendingNew);

    async function loadMainPlaceOptions() {
      const select = document.getElementById('subPlacesMainSelect');
      const previous = select.value;
      select.innerHTML = '<option value="">Loading...</option>';
      try {
        const res = await fetchDutyPlaceOptionsViaApi();
        mainPlaceOptions = res.data;
        select.innerHTML = '<option value="">Select a main place</option>' +
          mainPlaceOptions.map(p => `<option value="${p._id}">${p.mainPlace}</option>`).join('');
        if (previous && mainPlaceOptions.some(p => p._id === previous)) {
          select.value = previous;
          select.dispatchEvent(new Event('change'));
        }
      } catch (err) {
        select.innerHTML = '<option value="">Could not load places</option>';
      }
    }

    document.getElementById('subPlacesMainSelect').addEventListener('change', (e) => {
      const id = e.target.value;
      const chipsBox = document.getElementById('existingSubPlacesChips');
      const input = document.getElementById('newSubPlaceInput');
      const addBtn = document.getElementById('addNewSubPlaceBtn');
      const saveBtn = document.getElementById('saveSubPlacesBtn');

      pendingNew.length = 0;
      renderPendingNew();

      if (!id) {
        chipsBox.innerHTML = '<span style="color:var(--ink-500); font-size:12.5px;">Select a main place above</span>';
        input.disabled = true; addBtn.disabled = true; saveBtn.disabled = true;
        return;
      }
      const place = mainPlaceOptions.find(p => p._id === id);
      chipsBox.innerHTML = (place && place.subPlaces.length)
        ? place.subPlaces.map(s => `<span class="chip">${s.name}</span>`).join('')
        : '<span style="color:var(--ink-500); font-size:12.5px;">No sub places yet</span>';
      input.disabled = false; addBtn.disabled = false; saveBtn.disabled = false;
    });

    document.getElementById('addNewSubPlaceBtn').addEventListener('click', () => addPendingFrom('newSubPlaceInput', pendingNew, renderPendingNew));
    document.getElementById('newSubPlaceInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('addNewSubPlaceBtn').click(); }
    });

    document.getElementById('saveSubPlacesBtn').addEventListener('click', async () => {
      const errBox = document.getElementById('addSubPlacesError');
      errBox.textContent = '';
      const id = document.getElementById('subPlacesMainSelect').value;
      if (!id || pendingNew.length === 0) { errBox.textContent = 'Select a main place and add at least one sub place.'; return; }

      const btn = document.getElementById('saveSubPlacesBtn');
      btn.disabled = true;
      try {
        await addSubPlacesViaApi(id, pendingNew.slice());
        pendingNew.length = 0;
        renderPendingNew();
        alert('Sub places added.');
        await loadMainPlaceOptions();
        document.getElementById('subPlacesMainSelect').value = id;
        document.getElementById('subPlacesMainSelect').dispatchEvent(new Event('change'));
      } catch (err) {
        errBox.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    // ---------- Tab 3: Existing Duty Places ----------
    const state = { search: '', page: 1, limit: 10 };
    let currentPlaces = [];

    function renderPlacesTable(res) {
      currentPlaces = res.data;
      const wrap = document.getElementById('dutyPlacesTableWrap');
      if (!res.data.length) {
        wrap.innerHTML = `<p style="color:var(--ink-500); font-size:13px;">${state.search ? 'No matching duty places found.' : 'No duty places yet. Add one from the "New Place" tab.'}</p>`;
      } else {
        const startSerial = (res.page - 1) * res.limit;
        wrap.innerHTML = `
          <div class="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Main Place</th><th>Sub Places</th><th>Added On</th><th></th></tr></thead>
              <tbody>
                ${res.data.map((p, i) => `
                  <tr data-id="${p._id}">
                    <td class="serial-col">${startSerial + i + 1}</td>
                    <td><b class="preserve-space">${p.mainPlace}</b></td>
                    <td>${p.subPlaces.map(s => `<span class="chip">${s.name}</span>`).join('') || '<span style="color:var(--ink-500); font-size:12px;">No sub places</span>'}</td>
                    <td style="white-space:nowrap; color:var(--ink-300); font-size:12.5px;">${formatDateTime(p.createdAt)}</td>
                    <td>
                      <div class="row-actions">
                        <button class="add-subplace-btn" data-id="${p._id}" title="Add sub place">➕</button>
                        <button class="edit-place-btn" data-id="${p._id}" title="Edit">✏️</button>
                        <button class="delete-place-btn" data-id="${p._id}" title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
        wirePlaceRowActions();
      }
      const from = res.total === 0 ? 0 : (res.page - 1) * res.limit + 1;
      const to = Math.min(res.page * res.limit, res.total);
      document.getElementById('dutyPlacesPageInfo').textContent = `Showing ${from}-${to} of ${res.total}`;
      document.getElementById('dutyPlacesPrevBtn').disabled = res.page <= 1;
      document.getElementById('dutyPlacesNextBtn').disabled = res.page >= res.totalPages;
    }

    function loadExistingPlaces() {
      document.getElementById('dutyPlacesTableWrap').innerHTML = '<p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p>';
      fetchDutyPlacesViaApi({ search: state.search, page: state.page, limit: state.limit })
        .then(renderPlacesTable)
        .catch(err => {
          document.getElementById('dutyPlacesTableWrap').innerHTML = `<p style="color:var(--danger); font-size:13px;">Could not load from MongoDB: ${err.message}</p>`;
        });
    }

    function wirePlaceRowActions() {
      document.querySelectorAll('.add-subplace-btn').forEach(btn => {
        btn.addEventListener('click', () => openAddSubPlaceModal(btn.dataset.id));
      });
      document.querySelectorAll('.edit-place-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditPlaceModal(btn.dataset.id));
      });
      document.querySelectorAll('.delete-place-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const p = currentPlaces.find(r => r._id === btn.dataset.id);
          if (!confirm(`Delete "${p ? p.mainPlace : 'this place'}" and all its sub places? This cannot be undone.`)) return;
          try {
            await deleteDutyPlaceViaApi(btn.dataset.id);
            loadExistingPlaces();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    }

    function openAddSubPlaceModal(id) {
      const p = currentPlaces.find(r => r._id === id);
      if (!p) return;
      const quickPending = [];
      openModal(`
        <h3 class="preserve-space">Add sub places — ${p.mainPlace}</h3>
        <div style="margin-bottom:10px;">${p.subPlaces.map(s => `<span class="chip">${s.name}</span>`).join('') || '<span style="color:var(--ink-500); font-size:12.5px;">No sub places yet</span>'}</div>
        <div class="field" style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1;"><label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">New sub place</label><input id="quickSubPlaceInput" placeholder="e.g. Gate D" /></div>
          <button class="btn btn-outline" type="button" id="quickAddBtn">+</button>
        </div>
        <div id="quickNewChips" style="margin:10px 0;"></div>
        <div class="error-text" id="quickAddError"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="quickCancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="quickSaveBtn" style="width:auto; padding:10px 20px;">Add</button>
        </div>
      `);
      const renderQuick = () => renderPendingChips('quickNewChips', quickPending, renderQuick);
      document.getElementById('quickAddBtn').addEventListener('click', () => addPendingFrom('quickSubPlaceInput', quickPending, renderQuick));
      document.getElementById('quickSubPlaceInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('quickAddBtn').click(); }
      });
      document.getElementById('quickCancelBtn').addEventListener('click', closeModal);
      document.getElementById('quickSaveBtn').addEventListener('click', async () => {
        const errBox = document.getElementById('quickAddError');
        if (quickPending.length === 0) { errBox.textContent = 'Add at least one sub place.'; return; }
        const btn = document.getElementById('quickSaveBtn');
        btn.disabled = true;
        try {
          await addSubPlacesViaApi(id, quickPending.slice());
          closeModal();
          loadExistingPlaces();
        } catch (err) {
          errBox.textContent = err.message;
          btn.disabled = false;
        }
      });
    }

    function openEditPlaceModal(id) {
      const p = currentPlaces.find(r => r._id === id);
      if (!p) return;
      const names = p.subPlaces.map(s => s.name);
      openModal(`
        <h3>Edit duty place</h3>
        <div class="field"><label>Main place</label><input id="editMainPlaceInput" value="${p.mainPlace}" /></div>
        <div class="field">
          <label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">Sub places</label>
          <div id="editSubPlaceRows"></div>
        </div>
        <div class="field" style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1;"><input id="editNewSubPlaceInput" placeholder="Add another sub place" /></div>
          <button class="btn btn-outline" type="button" id="editAddSubPlaceBtn">+</button>
        </div>
        <div class="error-text" id="editPlaceError"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="editCancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="editSaveBtn" style="width:auto; padding:10px 20px;">Save Changes</button>
        </div>
      `);
      const rowsBox = document.getElementById('editSubPlaceRows');
      const renderRows = () => {
        rowsBox.innerHTML = names.length ? names.map((n, i) => `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
            <input class="edit-subplace-name" data-i="${i}" value="${n}" style="flex:1;" />
            <button type="button" class="icon-btn edit-subplace-remove" data-i="${i}">✕</button>
          </div>`).join('') : '<p style="color:var(--ink-500); font-size:12.5px;">No sub places — add one below.</p>';
        rowsBox.querySelectorAll('.edit-subplace-name').forEach(inp => {
          inp.addEventListener('input', (e) => { names[parseInt(e.target.dataset.i, 10)] = e.target.value; });
        });
        rowsBox.querySelectorAll('.edit-subplace-remove').forEach(btn => {
          btn.addEventListener('click', () => { names.splice(parseInt(btn.dataset.i, 10), 1); renderRows(); });
        });
      };
      renderRows();

      document.getElementById('editAddSubPlaceBtn').addEventListener('click', () => {
        const input = document.getElementById('editNewSubPlaceInput');
        const val = input.value.trim();
        if (val) { names.push(val); input.value = ''; renderRows(); }
      });
      document.getElementById('editNewSubPlaceInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('editAddSubPlaceBtn').click(); }
      });
      document.getElementById('editCancelBtn').addEventListener('click', closeModal);
      document.getElementById('editSaveBtn').addEventListener('click', async () => {
        const errBox = document.getElementById('editPlaceError');
        const mainPlace = document.getElementById('editMainPlaceInput').value.trim();
        const cleanNames = names.map(n => n.trim()).filter(Boolean);
        if (!mainPlace || cleanNames.length === 0) { errBox.textContent = 'Main place and at least one sub place are required.'; return; }
        const btn = document.getElementById('editSaveBtn');
        btn.disabled = true;
        try {
          await updateDutyPlaceViaApi(id, { mainPlace, subPlaces: cleanNames });
          closeModal();
          loadExistingPlaces();
        } catch (err) {
          errBox.textContent = err.message;
          btn.disabled = false;
        }
      });
    }

    let dutyPlaceSearchTimer;
    document.getElementById('dutyPlaceSearchInput').addEventListener('input', (e) => {
      clearTimeout(dutyPlaceSearchTimer);
      dutyPlaceSearchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        loadExistingPlaces();
      }, 300);
    });
    document.getElementById('dutyPlacePageSizeSelect').addEventListener('change', (e) => {
      state.limit = parseInt(e.target.value, 10) || 10;
      state.page = 1;
      loadExistingPlaces();
    });
    document.getElementById('dutyPlacesPrevBtn').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadExistingPlaces(); } });
    document.getElementById('dutyPlacesNextBtn').addEventListener('click', () => { state.page += 1; loadExistingPlaces(); });

    document.getElementById('downloadDutyPlacesBtn').addEventListener('click', async () => {
      const btn = document.getElementById('downloadDutyPlacesBtn');
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Preparing...';
      try {
        const res = await fetchDutyPlacesViaApi({ search: state.search, page: 1, limit: 10000 });
        const rows = [];
        res.data.forEach(p => {
          if (!p.subPlaces.length) {
            rows.push({ 'Main Place': p.mainPlace, 'Sub Place': '', 'Added On': formatDateTime(p.createdAt) });
          } else {
            p.subPlaces.forEach(s => rows.push({
              'Main Place': p.mainPlace,
              'Sub Place': s.name,
              'Added On': formatDateTime(p.createdAt),
            }));
          }
        });
        exportRowsToExcel(rows, { filename: `duty_places_${Date.now()}.xlsx`, sheetName: 'Duty Places' });
      } catch (err) {
        alert('Could not export: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  }

  if (section === 'dutyStatus') {
    // ---------- Tab switching ----------
    const dsTabNames = ['assignDuty', 'showAssigned', 'finishedStatus'];
    document.querySelectorAll('#dutyStatusTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dutyStatusTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        dsTabNames.forEach(t => {
          document.getElementById('tab-' + t).style.display = (t === btn.dataset.tab) ? 'block' : 'none';
        });
        if (btn.dataset.tab === 'showAssigned') loadAssignedDuties();
      });
    });

    // ======================================================================
    // Tab 1: Assign Duty to Guard (drag main places + guards into a batch)
    // ======================================================================
    let placesData = [];
    let guardsData = [];
    let existingDutiesForDate = []; // already saved in the DB for the picked date
    let pendingDuties = []; // { clientId, dutyPlaceId, mainPlace, subPlaces, guardId, guardEmpId, guardName } - new, not yet submitted
    let clientIdCounter = 0;
    let placesFilter = '';
    let guardsFilter = '';

    // Requirement 1: never allow picking a duty date before today.
    document.getElementById('assignDutyDate').min = todayISODate();

    // Combines what's already saved for this date with what's being built
    // right now, so a guard/place can't be dragged in twice for the same day.
    function usedGuardEmpIds() {
      return new Set([
        ...pendingDuties.filter(d => d.guardEmpId).map(d => d.guardEmpId),
        ...existingDutiesForDate.map(d => d.guardEmpId),
      ]);
    }
    function usedMainPlaceKeys() {
      return new Set([
        ...pendingDuties.map(d => d.mainPlace.toLowerCase()),
        ...existingDutiesForDate.map(d => d.mainPlace.toLowerCase()),
      ]);
    }

    function renderPlacesList() {
      const box = document.getElementById('assignPlacesList');
      const used = usedMainPlaceKeys();
      const filtered = placesData.filter(p => p.mainPlace.toLowerCase().includes(placesFilter.toLowerCase()));
      if (!placesData.length) {
        box.innerHTML = '<p style="color:var(--ink-500); font-size:13px;">No duty places yet - add one from Add Duty Places.</p>';
        return;
      }
      if (!filtered.length) {
        box.innerHTML = '<p style="color:var(--ink-500); font-size:13px;">No main places match that search.</p>';
        return;
      }
      box.innerHTML = filtered.map((p, i) => {
        const isUsed = used.has(p.mainPlace.toLowerCase());
        return `
          <div class="assign-item${isUsed ? ' used' : ''}" draggable="${isUsed ? 'false' : 'true'}" data-place-id="${p._id}">
            <span class="idx">${i + 1}.</span> <span class="preserve-space">${p.mainPlace}</span>
            ${isUsed ? '<span style="margin-left:auto; font-size:10.5px; color:var(--ink-500);">assigned</span>' : ''}
          </div>`;
      }).join('');
    }

    function renderGuardsList() {
      const box = document.getElementById('assignGuardsList');
      if (!guardsData.length) {
        box.innerHTML = '<p style="color:var(--ink-500); font-size:13px;">No guards found - add one from Add Security.</p>';
        return;
      }
      const used = usedGuardEmpIds();
      const filtered = guardsData.filter(g =>
        g.first_name.toLowerCase().includes(guardsFilter.toLowerCase()) ||
        g.roll_no.toLowerCase().includes(guardsFilter.toLowerCase())
      );
      if (!filtered.length) {
        box.innerHTML = '<p style="color:var(--ink-500); font-size:13px;">No guards match that search.</p>';
        return;
      }
      box.innerHTML = filtered.map((g, i) => {
        const isUsed = used.has(g.roll_no);
        return `
          <div class="assign-item${isUsed ? ' used' : ''}" draggable="${isUsed ? 'false' : 'true'}" data-guard-id="${g._id}">
            <span class="idx">${i + 1}.</span> ${g.first_name} <span style="color:var(--ink-500);">(${g.roll_no})</span>
            ${isUsed ? '<span style="margin-left:auto; font-size:10.5px; color:var(--ink-500);">assigned</span>' : ''}
          </div>`;
      }).join('');
    }

    // Requirement 4 + 5: existing (locked) duties for the picked date are
    // shown first, then new pending ones, then a placeholder that's always
    // visible so it's clear there's room to drag in another duty.
    function renderDropZone() {
      const box = document.getElementById('assignDropZone');
      const existingHtml = existingDutiesForDate.map((d, i) => `
        <div class="duty-mini-card existing-duty">
          <div class="existing-badge">Already assigned</div>
          <div class="mini-place preserve-space">${d.mainPlace}</div>
          <div>${(d.subPlaces || []).map(s => `<span class="chip">${s}</span>`).join('')}</div>
          <div class="mini-guard-slot filled">${d.guardName} (${d.guardEmpId})</div>
        </div>`).join('');

      const pendingHtml = pendingDuties.map((d, i) => `
        <div class="duty-mini-card" data-client-id="${d.clientId}">
          <button type="button" class="remove-btn" data-client-id="${d.clientId}" title="Remove this duty">✕</button>
          <div class="mini-place preserve-space">${d.mainPlace}</div>
          <div>${d.subPlaces.length ? d.subPlaces.map(s => `<span class="chip">${s}</span>`).join('') : '<span style="color:var(--ink-500); font-size:11.5px;">No sub places</span>'}</div>
          <div class="mini-guard-slot${d.guardName ? ' filled' : ''}" data-client-id="${d.clientId}">${d.guardName ? d.guardName : 'Drop a guard here'}</div>
        </div>`).join('');

      const hasAny = existingDutiesForDate.length + pendingDuties.length > 0;
      const hintHtml = `<div class="assign-dropzone-hint">${hasAny ? '+ Drag a main place here to add another duty' : 'Drag a main place here to start'}</div>`;

      box.innerHTML = existingHtml + pendingHtml + hintHtml;
      // the batch changed - any earlier preview is now stale
      document.getElementById('assignPreviewWrap').innerHTML = '';
    }

    async function loadAssignBoard() {
      document.getElementById('assignPlacesList').innerHTML = '<p style="color:var(--ink-500); font-size:13px;">Loading...</p>';
      document.getElementById('assignGuardsList').innerHTML = '<p style="color:var(--ink-500); font-size:13px;">Loading...</p>';
      try {
        const [placesRes, guardsRes] = await Promise.all([
          fetchDutyPlaceOptionsViaApi(),
          fetchUsersViaApi({ role: 'security', limit: 1000 }),
        ]);
        placesData = placesRes.data;
        guardsData = guardsRes.data;
        renderPlacesList();
        renderGuardsList();
      } catch (err) {
        document.getElementById('assignPlacesList').innerHTML = `<p style="color:var(--danger); font-size:13px;">Could not load: ${err.message}</p>`;
        document.getElementById('assignGuardsList').innerHTML = '';
      }
    }

    async function ensureBoardDataLoaded() {
      if (!placesData.length && !guardsData.length) await loadAssignBoard();
    }

    // Requirement 4: when a duty date is picked, look up what's already
    // scheduled for that day so it shows up locked in the Duty Assignments
    // column, and so its places/guards can't be dragged in again.
    async function loadExistingDutiesForDate(dateStr) {
      if (!dateStr) {
        existingDutiesForDate = [];
        renderDropZone();
        renderPlacesList();
        renderGuardsList();
        return;
      }
      try {
        const res = await fetchDutyAssignmentsViaApi({ date: dateStr, limit: 1000 });
        existingDutiesForDate = res.data;
      } catch (err) {
        existingDutiesForDate = [];
        alert(`Could not check existing duties for that date: ${err.message}`);
      }
      renderDropZone();
      renderPlacesList();
      renderGuardsList();
    }

    document.getElementById('assignDutyDate').addEventListener('change', (e) => {
      loadExistingDutiesForDate(e.target.value);
    });

    let placesSearchTimer;
    document.getElementById('assignPlacesSearch').addEventListener('input', (e) => {
      clearTimeout(placesSearchTimer);
      placesSearchTimer = setTimeout(() => { placesFilter = e.target.value.trim(); renderPlacesList(); }, 150);
    });
    let guardsSearchTimer;
    document.getElementById('assignGuardsSearch').addEventListener('input', (e) => {
      clearTimeout(guardsSearchTimer);
      guardsSearchTimer = setTimeout(() => { guardsFilter = e.target.value.trim(); renderGuardsList(); }, 150);
    });

    function assignGuardToClientId(guardId, clientId) {
      const guard = guardsData.find(g => g._id === guardId);
      const target = pendingDuties.find(d => d.clientId === clientId);
      if (!guard || !target) return;
      const alreadyOn = pendingDuties.find(d => d.guardId === guardId);
      if (alreadyOn && alreadyOn.clientId !== clientId) {
        alert(`${guard.first_name} already has a duty in this batch. A duty is unique per guard - remove that card first, or drop a different guard.`);
        return;
      }
      const alreadyExisting = existingDutiesForDate.find(d => d.guardEmpId === guard.roll_no);
      if (alreadyExisting) {
        alert(`${guard.first_name} already has a duty assigned for this date.`);
        return;
      }
      target.guardId = guard._id;
      target.guardEmpId = guard.roll_no;
      target.guardName = guard.first_name;
      renderDropZone();
      renderGuardsList();
    }

    function assignGuardToFirstEmpty(guardId) {
      const target = pendingDuties.find(d => !d.guardEmpId);
      if (!target) {
        alert('Drag a main place into the Duty Assignments column first, then drop a guard onto its card.');
        return;
      }
      assignGuardToClientId(guardId, target.clientId);
    }

    const placesList = document.getElementById('assignPlacesList');
    const guardsList = document.getElementById('assignGuardsList');
    const dropZone = document.getElementById('assignDropZone');

    placesList.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.assign-item[data-place-id]');
      if (!item || item.classList.contains('used')) { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'place', id: item.dataset.placeId }));
      e.dataTransfer.effectAllowed = 'copy';
    });

    guardsList.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.assign-item[data-guard-id]');
      if (!item || item.classList.contains('used')) { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'guard', id: item.dataset.guardId }));
      e.dataTransfer.effectAllowed = 'copy';
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
      const slot = e.target.closest('.mini-guard-slot');
      dropZone.querySelectorAll('.mini-guard-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
      if (slot) slot.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', (e) => {
      if (e.target === dropZone) dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      dropZone.querySelectorAll('.mini-guard-slot.drag-over').forEach(s => s.classList.remove('drag-over'));

      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }

      if (payload.type === 'place') {
        const place = placesData.find(p => p._id === payload.id);
        if (!place) return;
        if (usedMainPlaceKeys().has(place.mainPlace.toLowerCase())) {
          alert(`${place.mainPlace} already has a duty for this date.`);
          return;
        }
        pendingDuties.push({
          clientId: 'd' + (++clientIdCounter),
          dutyPlaceId: place._id,
          mainPlace: place.mainPlace,
          subPlaces: place.subPlaces.map(s => s.name),
          guardId: null,
          guardEmpId: null,
          guardName: null,
        });
        renderDropZone();
        renderPlacesList();
        return;
      }

      if (payload.type === 'guard') {
        const slot = e.target.closest('.mini-guard-slot');
        if (slot) {
          assignGuardToClientId(payload.id, slot.dataset.clientId);
        } else {
          assignGuardToFirstEmpty(payload.id);
        }
      }
    });

    dropZone.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-btn');
      if (!removeBtn) return;
      pendingDuties = pendingDuties.filter(d => d.clientId !== removeBtn.dataset.clientId);
      renderDropZone();
      renderGuardsList();
      renderPlacesList();
    });

    // ---------- Preview -> confirm checkbox -> Submit (requirement 4) ----------
    document.getElementById('previewAssignBtn').addEventListener('click', () => {
      const dutyDate = document.getElementById('assignDutyDate').value;
      const previewWrap = document.getElementById('assignPreviewWrap');

      if (!dutyDate) { alert('Pick a duty date first.'); return; }
      if (dutyDate < todayISODate()) { alert('Duty date cannot be in the past. Please choose today or a later date.'); return; }
      if (pendingDuties.length === 0) { alert('Drag at least one main place (and a guard) into the Duty Assignments column first.'); return; }
      const incomplete = pendingDuties.filter(d => !d.guardEmpId);
      if (incomplete.length > 0) { alert(`${incomplete.length} duty card(s) still need a guard dropped onto them before you can preview.`); return; }

      previewWrap.innerHTML = `
        <div style="margin-top:16px;">
          <div class="card-title" style="margin-bottom:10px;">Preview — ${pendingDuties.length} duty assignment(s) for ${dutyDate}</div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Guard</th><th>Main Place</th><th>Sub Places</th></tr></thead>
              <tbody>
                ${pendingDuties.map((d, i) => `
                  <tr>
                    <td class="serial-col">${i + 1}</td>
                    <td><b>${d.guardName}</b></td>
                    <td class="preserve-space">${d.mainPlace}</td>
                    <td>${d.subPlaces.map(s => `<span class="chip">${s}</span>`).join('')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <label style="display:flex; align-items:center; gap:8px; margin:16px 0; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="confirmAssignCheck" />
            I've reviewed these duty assignments and confirm they are correct.
          </label>
          <div class="error-text" id="assignSubmitError"></div>
          <button class="btn btn-primary" id="submitAssignBtn" style="width:auto; padding:10px 22px;" disabled>Submit</button>
        </div>`;

      document.getElementById('confirmAssignCheck').addEventListener('change', (e) => {
        document.getElementById('submitAssignBtn').disabled = !e.target.checked;
      });

      document.getElementById('submitAssignBtn').addEventListener('click', async () => {
        const btn = document.getElementById('submitAssignBtn');
        const errBox = document.getElementById('assignSubmitError');
        errBox.textContent = '';
        btn.disabled = true;
        const originalLabel = btn.textContent;
        btn.textContent = 'Submitting...';
        try {
          const res = await bulkAssignDutiesViaApi({
            dutyDate,
            assignments: pendingDuties.map(d => ({
              guardEmpId: d.guardEmpId,
              guardName: d.guardName,
              dutyPlaceId: d.dutyPlaceId,
              mainPlace: d.mainPlace,
              subPlaces: d.subPlaces,
            })),
          });
          if (res.skippedCount > 0) {
            const reasons = res.results.filter(r => r.status === 'skipped').map(r => `${r.guardName || 'Row'}: ${r.reason}`).join('\n');
            alert(`${res.insertedCount} duty assignment(s) saved.\n${res.skippedCount} skipped:\n${reasons}`);
          } else {
            alert(`${res.insertedCount} duty assignment(s) saved.`);
          }
          pendingDuties = [];
          // Requirement 4/5: refresh what's "already assigned" for this date
          // so what was just submitted shows up locked, and the board stays
          // on the same date, ready to accept more drags right away.
          await loadExistingDutiesForDate(dutyDate);
        } catch (err) {
          errBox.textContent = err.message;
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      });
    });

    loadAssignBoard();
    renderDropZone();

    // ======================================================================
    // Tab 2: Show Assigned Duties (list + edit + delete)
    // ======================================================================
    const assignedState = { search: '', date: '', page: 1, limit: 10 };
    let currentAssignments = [];

    function renderAssignedTable(res) {
      currentAssignments = res.data;
      const wrap = document.getElementById('assignedTableWrap');
      if (!res.data.length) {
        wrap.innerHTML = `<p style="color:var(--ink-500); font-size:13px;">${assignedState.search || assignedState.date ? 'No matching duty assignments found.' : 'No duty assignments yet. Add one from the "Assign Duty to Guard" tab.'}</p>`;
      } else {
        const startSerial = (res.page - 1) * res.limit;
        wrap.innerHTML = `
          <div class="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Guard</th><th>Main Place</th><th>Sub Places</th><th>Duty Date</th><th>Status</th><th>Added On</th><th></th></tr></thead>
              <tbody>
                ${res.data.map((a, i) => {
                  const completed = isPastDutyDate(a.dutyDate);
                  return `
                  <tr data-id="${a._id}">
                    <td class="serial-col">${startSerial + i + 1}</td>
                    <td><b>${a.guardName}</b><br><span style="color:var(--ink-500); font-size:11.5px;">${a.guardEmpId}</span></td>
                    <td class="preserve-space">${a.mainPlace}</td>
                    <td>${a.subPlaces.map(s => `<span class="chip">${s}</span>`).join('')}</td>
                    <td><span class="badge badge-amber">${a.dateRange}</span></td>
                    <td><span class="badge ${completed ? 'badge-neutral' : 'badge-success'}">${completed ? 'Completed' : 'Upcoming'}</span></td>
                    <td style="white-space:nowrap; color:var(--ink-300); font-size:12.5px;">${formatDateTime(a.createdAt)}</td>
                    <td>
                      <div class="row-actions">
                        <button class="edit-btn" data-id="${a._id}" title="${completed ? 'Completed duties cannot be edited' : 'Edit'}" ${completed ? 'disabled' : ''}>✏️</button>
                        <button class="delete-btn" data-id="${a._id}" title="${completed ? 'Completed duties cannot be deleted' : 'Delete'}" ${completed ? 'disabled' : ''}>🗑</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;
        wireAssignedRowActions();
      }
      const from = res.total === 0 ? 0 : (res.page - 1) * res.limit + 1;
      const to = Math.min(res.page * res.limit, res.total);
      document.getElementById('assignedPageInfo').textContent = `Showing ${from}-${to} of ${res.total}`;
      document.getElementById('assignedPrevBtn').disabled = res.page <= 1;
      document.getElementById('assignedNextBtn').disabled = res.page >= res.totalPages;
    }

    function loadAssignedDuties() {
      document.getElementById('assignedTableWrap').innerHTML = '<p style="color:var(--ink-500); font-size:13px;">Loading from MongoDB...</p>';
      fetchDutyAssignmentsViaApi({ search: assignedState.search, date: assignedState.date, page: assignedState.page, limit: assignedState.limit })
        .then(renderAssignedTable)
        .catch(err => {
          document.getElementById('assignedTableWrap').innerHTML = `<p style="color:var(--danger); font-size:13px;">Could not load from MongoDB: ${err.message}</p>`;
        });
    }

    function wireAssignedRowActions() {
      document.querySelectorAll('#tab-showAssigned .edit-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => openEditAssignmentModal(btn.dataset.id));
      });
      document.querySelectorAll('#tab-showAssigned .delete-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async () => {
          const a = currentAssignments.find(r => r._id === btn.dataset.id);
          if (!confirm(`Remove ${a ? a.guardName : 'this guard'}'s duty at "${a ? a.mainPlace : 'this place'}"? This cannot be undone.`)) return;
          try {
            await deleteDutyAssignmentViaApi(btn.dataset.id);
            loadAssignedDuties();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    }

    async function openEditAssignmentModal(id) {
      const a = currentAssignments.find(r => r._id === id);
      if (!a) return;
      await ensureBoardDataLoaded();

      const dutyDateVal = a.dutyDate ? new Date(a.dutyDate).toISOString().slice(0, 10) : '';

      openModal(`
        <h3>Edit duty assignment</h3>
        <div class="field">
          <label>Guard</label>
          <select id="editAssignGuard">
            <option value="">Select guard</option>
            ${guardsData.map(g => `<option value="${g._id}" data-emp-id="${g.roll_no}" data-name="${g.first_name}" ${g.roll_no === a.guardEmpId ? 'selected' : ''}>${g.first_name} (${g.roll_no})</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Main place</label>
          <select id="editAssignPlace">
            <option value="">Select place</option>
            ${placesData.map(p => `<option value="${p._id}" ${p.mainPlace === a.mainPlace ? 'selected' : ''}>${p.mainPlace}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label style="display:block; font-size:12.5px; color:var(--ink-300); margin-bottom:6px;">Sub places (assigned automatically)</label>
          <div id="editAssignSubPlaces">${a.subPlaces.map(s => `<span class="chip">${s}</span>`).join('')}</div>
        </div>
        <div class="field"><label>Duty date</label><input type="date" id="editAssignDate" value="${dutyDateVal}" min="${todayISODate()}" /></div>
        <div class="error-text" id="editAssignError"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="editAssignCancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="editAssignSaveBtn" style="width:auto; padding:10px 20px;">Save Changes</button>
        </div>
      `);

      let currentSubPlaces = a.subPlaces.slice();
      document.getElementById('editAssignPlace').addEventListener('change', (e) => {
        const place = placesData.find(p => p._id === e.target.value);
        currentSubPlaces = place ? place.subPlaces.map(s => s.name) : [];
        document.getElementById('editAssignSubPlaces').innerHTML = currentSubPlaces.length
          ? currentSubPlaces.map(s => `<span class="chip">${s}</span>`).join('')
          : '<span style="color:var(--ink-500); font-size:12.5px;">No sub places for this place</span>';
      });

      document.getElementById('editAssignCancelBtn').addEventListener('click', closeModal);
      document.getElementById('editAssignSaveBtn').addEventListener('click', async () => {
        const errBox = document.getElementById('editAssignError');
        errBox.textContent = '';

        const guardSelect = document.getElementById('editAssignGuard');
        const guardOpt = guardSelect.options[guardSelect.selectedIndex];
        const placeSelect = document.getElementById('editAssignPlace');
        const placeOpt = placeSelect.options[placeSelect.selectedIndex];
        const dutyDate = document.getElementById('editAssignDate').value;

        if (!guardSelect.value || !placeSelect.value || !dutyDate || currentSubPlaces.length === 0) {
          errBox.textContent = 'Guard, main place, and duty date are all required.';
          return;
        }
        if (dutyDate < todayISODate()) {
          errBox.textContent = 'Duty date cannot be moved into the past. Choose today or a later date.';
          return;
        }

        const btn = document.getElementById('editAssignSaveBtn');
        btn.disabled = true;
        try {
          await updateDutyAssignmentViaApi(id, {
            guardEmpId: guardOpt.dataset.empId,
            guardName: guardOpt.dataset.name,
            dutyPlaceId: placeSelect.value,
            mainPlace: placeOpt.textContent,
            subPlaces: currentSubPlaces,
            dutyDate,
          });
          closeModal();
          loadAssignedDuties();
        } catch (err) {
          errBox.textContent = err.message;
          btn.disabled = false;
        }
      });
    }

    let assignedSearchTimer;
    document.getElementById('assignedSearchInput').addEventListener('input', (e) => {
      clearTimeout(assignedSearchTimer);
      assignedSearchTimer = setTimeout(() => {
        assignedState.search = e.target.value.trim();
        assignedState.page = 1;
        loadAssignedDuties();
      }, 300);
    });
    document.getElementById('assignedDateFilter').addEventListener('change', (e) => {
      assignedState.date = e.target.value;
      assignedState.page = 1;
      loadAssignedDuties();
    });
    document.getElementById('clearAssignedDateBtn').addEventListener('click', () => {
      document.getElementById('assignedDateFilter').value = '';
      assignedState.date = '';
      assignedState.page = 1;
      loadAssignedDuties();
    });
    document.getElementById('assignedPageSizeSelect').addEventListener('change', (e) => {
      assignedState.limit = parseInt(e.target.value, 10) || 10;
      assignedState.page = 1;
      loadAssignedDuties();
    });
    document.getElementById('assignedPrevBtn').addEventListener('click', () => { if (assignedState.page > 1) { assignedState.page -= 1; loadAssignedDuties(); } });
    document.getElementById('assignedNextBtn').addEventListener('click', () => { assignedState.page += 1; loadAssignedDuties(); });

    document.getElementById('downloadAssignedPdfBtn').addEventListener('click', async () => {
      const btn = document.getElementById('downloadAssignedPdfBtn');
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Preparing...';
      try {
        const res = await fetchDutyAssignmentsViaApi({ search: assignedState.search, date: assignedState.date, page: 1, limit: 10000 });
        const rows = res.data.map((a, i) => ({
          serial: i + 1,
          guard: `${a.guardName} (${a.guardEmpId})`,
          mainPlace: a.mainPlace,
          subPlaces: a.subPlaces.join(', '),
          dateRange: a.dateRange,
          status: isPastDutyDate(a.dutyDate) ? 'Completed' : 'Upcoming',
          addedOn: formatDateTime(a.createdAt),
        }));
        exportRowsToPdf(
          [
            { header: '#', key: 'serial' },
            { header: 'Guard', key: 'guard' },
            { header: 'Main Place', key: 'mainPlace' },
            { header: 'Sub Places', key: 'subPlaces' },
            { header: 'Duty Date', key: 'dateRange' },
            { header: 'Status', key: 'status' },
            { header: 'Added On', key: 'addedOn' },
          ],
          rows,
          { filename: `assigned_duties_${Date.now()}.pdf`, title: 'Assigned Duties' }
        );
      } catch (err) {
        alert('Could not export: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });

    // ======================================================================
    // Tab 3: Duty Finished Status - placeholder, still static mock data
    // (requirements for this tab to be given separately)
    // ======================================================================
    document.getElementById('exportPdfBtn').addEventListener('click', () => alert('PDF export simulated'));
  }
}

render('home');
