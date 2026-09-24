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

// Sections that show the guard's live duty assignments from MongoDB. Every
// time the guard opens one of these, duties are re-fetched, so a duty the
// admin assigns while the guard is logged in shows up on the next visit.
const DUTY_SECTIONS = ['home', 'myDuties'];
let currentSection = 'home';

const dutyState = { loaded: false, error: null, data: [] };
let dutyLoadSeq = 0; // ignore out-of-order responses if the guard clicks around quickly

async function loadMyDuties() {
  if (!user) return;
  const seq = ++dutyLoadSeq;
  try {
    const res = await fetchMyDutiesViaApi(user.roll_no);
    if (seq !== dutyLoadSeq) return;
    dutyState.data = res.data || [];
    dutyState.error = null;
    dutyState.loaded = true;
  } catch (err) {
    if (seq !== dutyLoadSeq) return;
    dutyState.error = err.message || 'Could not load your duties.';
  }
}

function paint(section) {
  document.getElementById('pageTitle').textContent = titles[section];
  document.getElementById('content').innerHTML = renderers[section]();
  attachHandlers(section);
}

function render(section) {
  currentSection = section;
  paint(section);

  if (DUTY_SECTIONS.includes(section)) {
    loadMyDuties().then(() => {
      if (currentSection === section) paint(section); // still on this page -> show fresh data
    });
  }
}

// Data comes from the database now, so escape it before putting it in HTML.
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sectionHead(title, sub) {
  return `<div class="section-head"><h2>${title}</h2><p>${sub}</p></div>`;
}

// Today's duty first, then upcoming (soonest first), then completed (latest first).
function splitDuties() {
  const list = dutyState.data;
  return {
    today: list.filter(d => d.status === 'today'),
    upcoming: list.filter(d => d.status === 'upcoming'),
    completed: list.filter(d => d.status === 'completed').reverse(),
  };
}

function prettyRange(dateRange) {
  return String(dateRange || '').replace('_', ' → ');
}

const STATUS_BADGE = {
  today: '<span class="badge badge-success">Today</span>',
  upcoming: '<span class="badge badge-amber">Upcoming</span>',
  completed: '<span class="badge badge-neutral">Completed</span>',
};

function dutyCard(d) {
  return `
    <div class="card">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="badge badge-amber">${esc(prettyRange(d.dateRange))}</span>
        ${STATUS_BADGE[d.status] || ''}
      </div>
      <div style="margin-top:10px; font-weight:700;">${esc(d.mainPlace)}</div>
      <div style="margin-top:8px;">${(d.subPlaces || []).map(sp => `<span class="chip">${esc(sp)}</span>`).join('')}</div>
    </div>`;
}

// Shown in place of the duty list while loading, on failure, or when empty.
// Returns '' when there is real data to show.
function dutyPlaceholder() {
  if (!dutyState.loaded) {
    return dutyState.error
      ? `<div class="card"><p style="color:var(--danger); font-size:13.5px;">${esc(dutyState.error)}</p>
           <button class="btn btn-outline" id="retryDutiesBtn" style="width:auto; padding:8px 18px; margin-top:12px;">Retry</button></div>`
      : '<div class="card"><p style="color:var(--ink-500); font-size:13.5px;">Loading your duties…</p></div>';
  }
  if (dutyState.data.length === 0) {
    return '<div class="card"><p style="color:var(--ink-300); font-size:13.5px;">No duties have been assigned to you yet. When an admin assigns you a duty it will appear here.</p></div>';
  }
  return '';
}

// Small warning when a refresh failed but we still have older data to show.
function staleWarning() {
  return dutyState.loaded && dutyState.error
    ? `<p style="color:var(--danger); font-size:12.5px; margin-bottom:12px;">Couldn't refresh: ${esc(dutyState.error)} Showing the last loaded duties.</p>`
    : '';
}

function myScans() {
  const mine = MOCK.scans.filter(s => s.guardLabel === myLabel);
  return mine.length ? mine : MOCK.scans; // demo fallback
}

const renderers = {
  home: () => {
    const { today, upcoming } = splitDuties();
    const scheduled = today.length + upcoming.length;
    const highlight = today.length ? today : upcoming.slice(0, 1);
    const highlightTitle = today.length ? "Today's duty" : 'Next duty';

    return `
    ${sectionHead('Welcome back, ' + esc(user.first_name.split(' ')[0]), esc(user.designation) + ' • Roll No ' + esc(user.roll_no))}
    <div class="grid-stats">
      <div class="stat-card"><div class="num">${dutyState.loaded ? scheduled : '…'}</div><div class="label">Duty assignment(s) scheduled</div></div>
      <div class="stat-card"><div class="num">6PM–6AM</div><div class="label">QR scan window</div></div>
    </div>
    ${staleWarning()}
    ${dutyPlaceholder() || (highlight.length
      ? `<div class="card-title" style="margin-bottom:10px;">${highlightTitle}</div>${highlight.map(dutyCard).join('')}`
      : '<div class="card"><p style="color:var(--ink-300); font-size:13.5px;">You have no upcoming duties. Past duties are listed under My Duties.</p></div>')}
    <div class="card">
      <div class="card-title">Reminder</div>
      <p style="color:var(--ink-300); font-size:13.5px;">QR scanning is only accepted between 6:00 PM and 6:00 AM. Scans outside this window will be rejected.</p>
    </div>
  `;
  },

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
      <input type="file" id="imageFileInput" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style="display:none;">
      <div style="display:flex; gap:10px;">
        <button class="btn btn-outline" id="pickImgBtn" style="flex:1;">Pick Image</button>
      </div>
      <div class="field" style="margin-top:14px;">
        <label>Comment <span style="color:var(--amber);">*</span></label>
        <textarea id="imageCommentInput" rows="3" maxlength="500" placeholder="Describe what this photo shows (required, min 3 characters)"></textarea>
        <div style="display:flex; justify-content:flex-end; margin-top:4px;">
          <span id="imageCommentCount" style="font-size:11px; color:var(--ink-500);">0 / 500</span>
        </div>
      </div>
      <button class="btn btn-primary" id="uploadImgBtn" style="width:100%;" disabled>Upload</button>
      <div class="error-text" id="imageUploadError"></div>
      <p style="color:var(--ink-500); font-size:11.5px; margin-top:8px;">
        Accepted formats: JPG, JPEG, PNG only. Size must be between 10 KB and 2 MB. Comment must be 3-500 characters.
      </p>
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

  myDuties: () => {
    const { today, upcoming, completed } = splitDuties();
    const group = (label, list) => list.length
      ? `<div class="card-title" style="margin:18px 0 10px;">${label} (${list.length})</div>${list.map(dutyCard).join('')}`
      : '';

    return `
    ${sectionHead('My Duties', 'Duties your admin has assigned to you.')}
    ${staleWarning()}
    ${dutyPlaceholder() || (group('Today', today) + group('Upcoming', upcoming) + group('Completed', completed))}
  `;
  },

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
  const retry = document.getElementById('retryDutiesBtn');
  if (retry) retry.addEventListener('click', () => render(section));

  if (section === 'scanQr') {
    document.getElementById('simulateScanBtn').addEventListener('click', () => {
      const place = MOCK.dutyPlaces[1].subPlaces[0];
      document.getElementById('scanResult').innerHTML = `
        <div style="background:var(--navy-800); padding:12px; border-radius:8px; margin-bottom:10px;">Scanned data: <b>${place}</b></div>
        <button class="btn btn-primary" style="width:auto; padding:8px 20px;" onclick="alert('Attendance recorded (simulated)')">Submit</button>`;
    });
  }

  if (section === 'uploadImages') {
    // Same rules as admin.js's Upload Image tab (see routes/uploadedImages.js
    // for the server-side checks these mirror): jpg/jpeg/png only, 10 KB -
    // 2 MB, must actually decode as an image, and a 3-500 character comment
    // is required before Upload unlocks.
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
    const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
    const MIN_IMAGE_SIZE = 10 * 1024; // 10 KB
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
    const MIN_COMMENT_LENGTH = 3;
    const MAX_COMMENT_LENGTH = 500;

    const fileInput = document.getElementById('imageFileInput');
    const previewTile = document.querySelector('#content .ph');
    const pickBtn = document.getElementById('pickImgBtn');
    const commentInput = document.getElementById('imageCommentInput');
    const commentCount = document.getElementById('imageCommentCount');
    const uploadBtn = document.getElementById('uploadImgBtn');
    const errBox = document.getElementById('imageUploadError');

    let selectedFile = null;

    function formatKB(bytes) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    function commentError() {
      const len = commentInput.value.trim().length;
      if (len === 0) return 'Please write a comment describing the photo.';
      if (len < MIN_COMMENT_LENGTH) return `Comment must be at least ${MIN_COMMENT_LENGTH} characters.`;
      if (len > MAX_COMMENT_LENGTH) return `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`;
      return '';
    }

    function updateCommentCount() {
      const len = commentInput.value.trim().length;
      commentCount.textContent = `${len} / ${MAX_COMMENT_LENGTH}`;
      commentCount.style.color = (len > 0 && len < MIN_COMMENT_LENGTH) ? '#e2574c' : 'var(--ink-500)';
    }

    function refreshUploadButton() {
      uploadBtn.disabled = !(selectedFile && !commentError());
    }

    function resetSelection() {
      selectedFile = null;
      fileInput.value = '';
      previewTile.innerHTML = '🖼';
      refreshUploadButton();
    }

    pickBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      errBox.textContent = '';
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isAllowedType = ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_IMAGE_EXTENSIONS.includes(ext);
      if (!isAllowedType) {
        errBox.textContent = 'Only JPG, JPEG or PNG images are allowed.';
        resetSelection();
        return;
      }

      if (file.size < MIN_IMAGE_SIZE) {
        errBox.textContent = `Image is too small (${formatKB(file.size)}). Minimum size is 10 KB.`;
        resetSelection();
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errBox.textContent = `Image is too large (${formatKB(file.size)}). Maximum size is 2 MB.`;
        resetSelection();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const probe = new Image();
        probe.onload = () => {
          selectedFile = file;
          previewTile.innerHTML = `<img src="${reader.result}" alt="Selected image" style="width:100%; height:100%; object-fit:cover;">`;
          refreshUploadButton();
        };
        probe.onerror = () => {
          errBox.textContent = 'This file is not a valid image. Please pick a different JPG or PNG.';
          resetSelection();
        };
        probe.src = reader.result;
      };
      reader.onerror = () => {
        errBox.textContent = 'Could not read the selected file. Please try again.';
        resetSelection();
      };
      reader.readAsDataURL(file);
    });

    commentInput.addEventListener('input', () => {
      if (commentInput.value.length > MAX_COMMENT_LENGTH) {
        commentInput.value = commentInput.value.slice(0, MAX_COMMENT_LENGTH);
      }
      errBox.textContent = '';
      updateCommentCount();
      refreshUploadButton();
    });

    updateCommentCount();

    uploadBtn.addEventListener('click', async () => {
      if (!selectedFile) {
        errBox.textContent = 'Please pick an image first.';
        return;
      }
      const cErr = commentError();
      if (cErr) {
        errBox.textContent = cErr;
        return;
      }
      const comment = commentInput.value.trim();

      errBox.textContent = '';
      uploadBtn.disabled = true;
      pickBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';
      try {
        await uploadImageViaApi({
          file: selectedFile,
          comment,
          guardEmpId: user.roll_no,
          guardName: user.first_name,
        });
        alert('Image uploaded successfully.');
        resetSelection();
        commentInput.value = '';
        updateCommentCount();
      } catch (err) {
        errBox.textContent = err.message || 'Could not upload the image.';
        refreshUploadButton();
      } finally {
        uploadBtn.textContent = 'Upload';
        pickBtn.disabled = false;
      }
    });
  }
}

render('home');
