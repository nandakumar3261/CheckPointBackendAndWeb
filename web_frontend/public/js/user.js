const user = requireRole('security');
const myLabel = user ? `${user.first_name} ( ${user.roll_no} )` : '';

const titles = {
  home: 'Home',
  scanQr: 'Scan QR Code',
  uploadImages: 'Upload Images',
  getQrData: 'Get QR Code Data',
  myDuties: 'My Duties',
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

function myAssignments() {
  const mine = MOCK.assignments.filter(a => a.guardLabel === myLabel);
  return mine.length ? mine : MOCK.assignments; // demo fallback
}
function myScans() {
  const mine = MOCK.scans.filter(s => s.guardLabel === myLabel);
  return mine.length ? mine : MOCK.scans; // demo fallback
}

const renderers = {
  home: () => `
    ${sectionHead('Welcome back, ' + user.first_name.split(' ')[0], user.designation + ' • Roll No ' + user.roll_no)}
    <div class="grid-stats">
      <div class="stat-card"><div class="num">${myAssignments().length}</div><div class="label">Duty assignment(s) scheduled</div></div>
      <div class="stat-card"><div class="num">6PM–6AM</div><div class="label">QR scan window</div></div>
    </div>
    <div class="card">
      <div class="card-title">Reminder</div>
      <p style="color:var(--ink-300); font-size:13.5px;">QR scanning is only accepted between 6:00 PM and 6:00 AM. Scans outside this window will be rejected.</p>
    </div>
  `,

  scanQr: () => `
    ${sectionHead('Scan QR Code', 'Scan the QR code posted at your duty sub-place to log attendance.')}
    <div class="card" style="max-width:420px; text-align:center;">
      <div style="font-size:46px; margin-bottom:10px;">▦</div>
      <button class="btn btn-primary" id="simulateScanBtn" style="width:auto; padding:12px 24px;">Scan QR Code</button>
      <div id="scanResult" style="margin-top:16px;"></div>
    </div>
  `,

  uploadImages: () => `
    ${sectionHead('Upload Images', 'Submit a photo as proof of your site visit.')}
    <div class="card" style="max-width:420px;">
      <div class="image-tile" style="margin-bottom:14px;"><div class="ph" style="height:160px;">🖼</div></div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-outline" id="pickImgBtn" style="flex:1;">Pick Image</button>
        <button class="btn btn-primary" id="uploadImgBtn" style="flex:1;" disabled>Upload</button>
      </div>
    </div>
  `,

  getQrData: () => `
    ${sectionHead('Get QR Code Data', 'Your attendance scan history.')}
    <div class="card">
      <table>
        <thead><tr><th>Place</th><th>Timestamp</th><th>Date Range</th></tr></thead>
        <tbody>
          ${myScans().map(s => `<tr><td>${s.scannedPlace}</td><td>${s.timestamp}</td><td>${s.dateRange}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `,

  myDuties: () => `
    ${sectionHead('My Duties', 'Your scheduled duty assignments.')}
    ${myAssignments().map(a => `
      <div class="card">
        <span class="badge badge-amber">${a.dateRange}</span>
        <div style="margin-top:10px; font-weight:700;">${a.mainPlace}</div>
        <div style="margin-top:8px;">${a.subPlaces.map(s => `<span class="chip">${s}</span>`).join('')}</div>
      </div>`).join('')}
  `,

  profile: () => `
    ${sectionHead('Update Profile Pic', 'View your details and update your photo.')}
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
      const place = MOCK.dutyPlaces[1].subPlaces[0];
      document.getElementById('scanResult').innerHTML = `
        <div style="background:var(--navy-800); padding:12px; border-radius:8px; margin-bottom:10px;">Scanned data: <b>${place}</b></div>
        <button class="btn btn-primary" style="width:auto; padding:8px 20px;" onclick="alert('Attendance recorded (simulated)')">Submit</button>`;
    });
  }

  if (section === 'uploadImages') {
    document.getElementById('pickImgBtn').addEventListener('click', () => {
      document.querySelector('.ph').textContent = '✅';
      document.getElementById('uploadImgBtn').disabled = false;
    });
    document.getElementById('uploadImgBtn').addEventListener('click', () => alert('Image uploaded (simulated)'));
  }
}

render('home');
