const user = requireRole('security');

const titles = {
  home: 'Home',
  images: 'Images',
  logs: 'Logs/Data',
  profile: 'Update Profile Pic',
  contact: 'Contact Us',
};

// Fills an .avatar element with the guard's profile photo, or their first
// letter when they haven't uploaded one yet.
function fillAvatar(el) {
  if (!el || !user) return;
  if (user.profile_pic) {
    el.innerHTML = `<img src="${esc(user.profile_pic)}" alt="${esc(user.first_name)}">`;
  } else {
    el.textContent = user.first_name.charAt(0);
  }
}

// Sidebar header (name + photo) and the mobile topbar avatar.
function paintIdentity() {
  if (!user) return;
  document.getElementById('sidebarName').textContent = user.first_name;
  document.getElementById('sidebarSub').textContent = user.designation || 'Security Guard';
  document.getElementById('whoName').textContent = user.first_name;
  fillAvatar(document.getElementById('sidebarAvatar'));
  fillAvatar(document.getElementById('avatarInitial'));
}

paintIdentity();

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
const DUTY_SECTIONS = ['home'];
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

function openModal(html, { maxWidth } = {}) {
  const box = document.getElementById('modalBox');
  box.innerHTML = html;
  box.style.maxWidth = maxWidth || '';
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('modalBox').innerHTML = '';
  document.getElementById('modalBox').style.maxWidth = '';
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});

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

// "YYYY-MM-DD" for today in the browser's local time.
function todayISODate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const renderers = {
  home: () => {
    const { today, upcoming, completed } = splitDuties();
    const scheduled = today.length + upcoming.length;
    const group = (label, list) => list.length
      ? `<div class="card-title" style="margin:18px 0 10px;">${label} (${list.length})</div>${list.map(dutyCard).join('')}`
      : '';

    return `
    ${sectionHead('Welcome back, ' + esc(user.first_name.split(' ')[0]), esc(user.designation) + ' • Roll No ' + esc(user.roll_no))}
    <div class="grid-stats">
      <div class="stat-card"><div class="num">${dutyState.loaded ? scheduled : '…'}</div><div class="label">Duty assignment(s) scheduled</div></div>
      <div class="stat-card"><div class="num">6PM–6AM</div><div class="label">QR scan window</div></div>
    </div>
    <div class="card">
      <div class="card-title">Reminder</div>
      <p style="color:var(--ink-300); font-size:13.5px;">QR scanning is only accepted between 6:00 PM and 6:00 AM. Scans outside this window will be rejected.</p>
    </div>
    <div class="section-head" style="margin:26px 0 4px;"><h2>My Duties</h2><p>Duties your admin has assigned to you.</p></div>
    ${staleWarning()}
    ${dutyPlaceholder() || (group('Today', today) + group('Upcoming', upcoming) + group('Completed', completed))}
  `;
  },

  images: () => `
    ${sectionHead('Images', 'Upload site-visit photo evidence and review the photos you have submitted.')}

    <div class="tabs" id="imagesTabs">
      <button class="tab-btn active" data-tab="uploadImage" type="button">Upload Images</button>
      <button class="tab-btn" data-tab="getImages" type="button">Get Images</button>
    </div>

    <div class="tab-panel" id="tab-uploadImage">
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
    </div>

    <div class="tab-panel" id="tab-getImages" style="display:none;">
      <div class="image-grid" id="myImagesGrid">
        <p style="color:var(--ink-500); font-size:13px;">Loading your images...</p>
      </div>
    </div>
  `,

  logs: () => `
    ${sectionHead('Logs/Data', 'Every sub place assigned to you, and whether it was scanned.')}
    <div class="card">
      <div class="data-toolbar">
        <div class="toolbar-right" style="margin-left:0; gap:10px; flex-wrap:wrap;">
          <select id="logsFilter">
            <option value="date" selected>Date</option>
            <option value="all">All</option>
          </select>
          <input type="date" id="logsDate" value="${todayISODate()}" max="${todayISODate()}">
        </div>
        <div class="toolbar-right" style="margin-left:auto;">
          <span id="logsSummary" style="font-size:12.5px; color:var(--ink-500);"></span>
          <button class="btn btn-outline" id="downloadLogsPdfBtn" type="button" style="width:auto; padding:9px 16px;" disabled>⬇ Download PDF</button>
        </div>
      </div>
      <div class="table-scroll" id="logsTableWrap">
        <p style="color:var(--ink-500); font-size:13px; padding:8px 0;">Loading...</p>
      </div>
    </div>
  `,

  profile: () => `
    ${sectionHead('Update Profile Pic', 'View your details and update your photo.')}
    <div class="card" style="max-width:420px; text-align:center;">
      <div class="avatar avatar-xl" id="profileAvatar" style="margin:0 auto 16px;"></div>
      <input type="file" id="profilePicInput" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style="display:none;">
      <button class="btn btn-outline" id="changePhotoBtn" style="width:auto; padding:8px 18px; margin-bottom:8px;">Change Photo</button>
      <div class="error-text" id="profilePicError"></div>
      <p style="color:var(--ink-500); font-size:11.5px; margin-bottom:14px;">JPG or PNG, up to 2 MB.</p>
      <table style="text-align:left;">
        <tr><td style="color:var(--ink-500);">Name</td><td>${esc(user.first_name)}</td></tr>
        <tr><td style="color:var(--ink-500);">Designation</td><td>${esc(user.designation)}</td></tr>
        <tr><td style="color:var(--ink-500);">Roll No</td><td>${esc(user.roll_no)}</td></tr>
        <tr><td style="color:var(--ink-500);">Mobile</td><td>${esc(user.mobile)}</td></tr>
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

  if (section === 'profile') {
    fillAvatar(document.getElementById('profileAvatar'));

    const picInput = document.getElementById('profilePicInput');
    const changeBtn = document.getElementById('changePhotoBtn');
    const picErr = document.getElementById('profilePicError');

    changeBtn.addEventListener('click', () => picInput.click());

    picInput.addEventListener('change', async () => {
      picErr.textContent = '';
      const file = picInput.files && picInput.files[0];
      if (!file) return;

      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['jpg', 'jpeg', 'png'].includes(ext)) {
        picErr.textContent = 'Only JPG, JPEG or PNG images are allowed.';
        picInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        picErr.textContent = 'Image is too large. Maximum size is 2 MB.';
        picInput.value = '';
        return;
      }

      changeBtn.disabled = true;
      changeBtn.textContent = 'Uploading...';
      try {
        const res = await uploadProfilePicViaApi(user.roll_no, file);
        user.profile_pic = res.profile_pic;
        setCurrentUser(user); // keep the session copy in sync
        paintIdentity();
        fillAvatar(document.getElementById('profileAvatar'));
      } catch (err) {
        picErr.textContent = err.message || 'Could not upload the photo.';
      } finally {
        changeBtn.disabled = false;
        changeBtn.textContent = 'Change Photo';
        picInput.value = '';
      }
    });
  }

  if (section === 'logs') {
    const filterSel = document.getElementById('logsFilter');
    const dateInput = document.getElementById('logsDate');
    const wrap = document.getElementById('logsTableWrap');
    const summary = document.getElementById('logsSummary');
    const pdfBtn = document.getElementById('downloadLogsPdfBtn');
    let logsSeq = 0; // ignore out-of-order responses if the filter changes quickly
    let loaded = { duties: [], byDate: true, date: '' }; // what's on screen right now, for the PDF

    // "22/09/2026, 10:52 am"
    function fmtDateTime(iso) {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }

    // One serial number per duty (Main Place + Duty Date Range, merged cells),
    // with EVERY sub place assigned to the guard numbered underneath, each
    // marked Scanned / Not scanned and every scan time stacked in its Scanned
    // At cell. Shared by the on-screen table and the PDF.
    function groupLogRows(duties) {
      const rows = [];
      duties.forEach((g, gi) => {
        const subs = (g.subPlaces || []).map(sp => ({
          name: sp.name,
          scanned: !!sp.scanned,
          times: (sp.scans || []).slice().sort((x, y) => new Date(x) - new Date(y)),
        }));
        subs.forEach((sub, i) => rows.push({ group: g, groupIndex: gi + 1, span: subs.length, first: i === 0, subIndex: i + 1, sub }));
      });
      return rows;
    }

    function buildLogsTable(duties) {
      const rows = groupLogRows(duties);

      const body = rows.map(r => {
        const zebra = r.groupIndex % 2 === 0 ? ' style="background:rgba(255,255,255,0.025);"' : '';
        const merged = r.first
          ? `<td class="serial-col" rowspan="${r.span}" style="vertical-align:top;">${r.groupIndex}</td>
             <td class="preserve-space" rowspan="${r.span}" style="vertical-align:top;">${esc(r.group.mainPlace)}</td>
             <td rowspan="${r.span}" style="vertical-align:top; white-space:nowrap;">${esc(prettyRange(r.group.dateRange))}</td>`
          : '';
        return `<tr${zebra}>${merged}
          <td class="serial-col">${r.subIndex}</td>
          <td class="preserve-space">${esc(r.sub.name)}</td>
          <td style="white-space:nowrap;"><span class="badge ${r.sub.scanned ? 'badge-success' : 'badge-neutral'}">${r.sub.scanned ? 'Scanned' : 'Not scanned'}</span></td>
          <td style="white-space:nowrap;">${r.sub.scanned ? r.sub.times.map(fmtDateTime).join('<br>') : '—'}</td>
        </tr>`;
      }).join('');

      return `
        <table class="recent-scans-table" style="min-width:1020px;">
          <colgroup>
            <col style="width:56px;"><col style="width:190px;"><col style="width:190px;">
            <col style="width:64px;"><col style="width:240px;"><col style="width:130px;"><col style="width:170px;">
          </colgroup>
          <thead><tr>
            <th class="serial-col">#</th><th>Main Place</th><th>Duty Date Range</th>
            <th class="serial-col">Sub #</th><th>Sub Place</th><th>Status</th><th>Scanned At</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>`;
    }
    function prettyDateStr(iso) {
      const [y, m, d] = iso.split('-');
      return `${d}-${m}-${y}`;
    }

    async function loadLogs() {
      const seq = ++logsSeq;
      const byDate = filterSel.value === 'date';
      dateInput.style.display = byDate ? '' : 'none'; // "All" -> no date picker

      // Date mode needs a valid date: an empty/partial picker falls back to
      // today, and a future date is clamped to today.
      if (byDate) {
        const v = dateInput.value;
        const valid = /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0, 4)) >= 2000;
        if (!valid || v > todayISODate()) dateInput.value = todayISODate();
      }
      const date = byDate ? dateInput.value : '';

      wrap.innerHTML = '<p style="color:var(--ink-500); font-size:13px; padding:8px 0;">Loading...</p>';
      summary.textContent = '';
      pdfBtn.disabled = true;
      loaded = { duties: [], byDate, date };
      try {
        // Every sub place assigned to this guard, tagged scanned / not scanned.
        const { data } = await fetchQrScanCoverageViaApi({ guardEmpId: user.roll_no, date });
        if (seq !== logsSeq) return;

        loaded = { duties: data, byDate, date };
        pdfBtn.disabled = data.length === 0;

        const allSubs = data.flatMap(d => d.subPlaces || []);
        const scannedCount = allSubs.filter(sp => sp.scanned).length;
        summary.textContent = `${scannedCount} of ${allSubs.length} sub place${allSubs.length === 1 ? '' : 's'} scanned • ${byDate ? 'Duty ' + prettyDateStr(date) : 'All dates'}`;

        if (data.length === 0) {
          wrap.innerHTML = `<p style="color:var(--ink-300); font-size:13.5px; padding:8px 0;">${
            byDate ? 'No duty was assigned to you for ' + esc(prettyDateStr(date)) + '.' : 'No duties have been assigned to you yet.'
          }</p>`;
          return;
        }

        wrap.innerHTML = buildLogsTable(data);
      } catch (err) {
        if (seq !== logsSeq) return;
        wrap.innerHTML = `<p style="color:var(--danger); font-size:13px; padding:8px 0;">${esc(err.message || 'Could not load your logs.')}</p>
          <button class="btn btn-outline" id="retryLogsBtn" style="width:auto; padding:8px 18px;">Retry</button>`;
        document.getElementById('retryLogsBtn').addEventListener('click', loadLogs);
      }
    }

    filterSel.addEventListener('change', loadLogs);

    // Typing a date fires "change" for every intermediate year (0002, 0020,
    // 0202, 2026...), so wait for the typing to settle and skip incomplete
    // years instead of querying each one. Picking from the calendar loads
    // immediately.
    let dateTimer = null;
    dateInput.addEventListener('change', () => {
      clearTimeout(dateTimer);
      const v = dateInput.value;
      const complete = /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0, 4)) >= 2000;
      if (v && !complete) return; // still typing the year
      dateTimer = setTimeout(loadLogs, 200);
    });
    // ---------- Download PDF: mirrors the on-screen table (merged cells) ----------
    pdfBtn.addEventListener('click', () => {
      if (!loaded.duties.length) {
        alert('Nothing to export.');
        return;
      }
      if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
        alert('The PDF export library did not load. Check your internet connection and try again.');
        return;
      }

      const rows = groupLogRows(loaded.duties);
      const body = rows.map(r => {
        const row = [];
        if (r.first) {
          row.push({ content: String(r.groupIndex), rowSpan: r.span, styles: { valign: 'top' } });
          row.push({ content: r.group.mainPlace, rowSpan: r.span, styles: { valign: 'top' } });
          // Plain "to" - the PDF's built-in font has no arrow glyph.
          row.push({ content: String(r.group.dateRange || '').replace('_', ' to '), rowSpan: r.span, styles: { valign: 'top' } });
        }
        row.push(String(r.subIndex));
        row.push(r.sub.name);
        row.push(r.sub.scanned ? 'Scanned' : 'Not scanned');
        row.push(r.sub.scanned ? r.sub.times.map(fmtDateTime).join('\n') : '-');
        return row;
      });

      const scope = loaded.byDate ? `Duty date ${prettyDateStr(loaded.date)}` : 'All dates';
      const doc = new jspdf.jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(`Logs/Data - ${user.first_name} (${user.roll_no})`, 14, 15);
      doc.setFontSize(10);
      const pdfSubs = loaded.duties.flatMap(d => d.subPlaces || []);
      doc.text(`${scope}  |  ${pdfSubs.filter(sp => sp.scanned).length} of ${pdfSubs.length} sub places scanned`, 14, 21);
      doc.autoTable({
        startY: 26,
        theme: 'grid',
        head: [['#', 'Main Place', 'Duty Date Range', 'Sub #', 'Sub Place', 'Status', 'Scanned At']],
        body,
        styles: { fontSize: 8, lineWidth: 0.1, lineColor: [38, 56, 90] },
        headStyles: { fillColor: [18, 33, 58] },
      });
      doc.save(`logs_${user.roll_no}_${loaded.byDate ? loaded.date : 'all'}.pdf`);
    });

    loadLogs(); // default: today's date
  }

  if (section === 'images') {
    // ---------- Tab switching ----------
    const imgTabNames = ['uploadImage', 'getImages'];
    document.querySelectorAll('#imagesTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#imagesTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        imgTabNames.forEach(t => {
          document.getElementById('tab-' + t).style.display = (t === btn.dataset.tab) ? 'block' : 'none';
        });
        if (btn.dataset.tab === 'getImages') loadMyImages();
      });
    });

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
    const previewTile = document.querySelector('#tab-uploadImage .ph');
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

    // ======================================================================
    // Tab: Get Images - only the photos THIS guard has uploaded (the server
    // filters by guardEmpId), most recent first. Tap a thumbnail to open it
    // full-size; each tile also has a Download button.
    // ======================================================================
    let myImagesById = new Map();

    function imageDownloadName(img) {
      const uploaded = new Date(img.uploadedAt || img.createdAt);
      const stamp = isNaN(uploaded.getTime())
        ? Date.now()
        : uploaded.toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const dot = img.imageUrl.lastIndexOf('.');
      const ext = dot === -1 ? '.jpg' : img.imageUrl.slice(dot);
      return `${img.guardEmpId}_${stamp}${ext}`;
    }

    function imageDateTime(img) {
      const uploaded = new Date(img.uploadedAt || img.createdAt);
      if (isNaN(uploaded.getTime())) return { dateStr: '—', timeStr: '' };
      return {
        dateStr: uploaded.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        timeStr: uploaded.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
    }

    function openMyImagePreview(id) {
      const img = myImagesById.get(id);
      if (!img) return;
      const { dateStr, timeStr } = imageDateTime(img);
      openModal(`
        <div class="image-preview-modal">
          <img src="${esc(img.imageUrl)}" alt="Your uploaded image">
          <div class="meta">
            <span>${dateStr} • ${timeStr}</span>
            <p class="comment">"${esc(img.comment)}"</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="closePreviewBtn">Close</button>
            <a class="btn btn-primary" style="width:auto; padding:10px 20px; text-decoration:none;" href="${esc(img.imageUrl)}" download="${esc(imageDownloadName(img))}">Download</a>
          </div>
        </div>
      `, { maxWidth: '640px' });
      document.getElementById('closePreviewBtn').addEventListener('click', closeModal);
    }

    async function loadMyImages() {
      const grid = document.getElementById('myImagesGrid');
      grid.innerHTML = '<p style="color:var(--ink-500); font-size:13px;">Loading your images...</p>';
      try {
        const { data } = await fetchUploadedImagesViaApi({ guardEmpId: user.roll_no, limit: 100 });
        myImagesById = new Map(data.map(img => [img._id, img]));

        if (data.length === 0) {
          grid.innerHTML = '<p style="color:var(--ink-500); font-size:13px;">You have not uploaded any images yet.</p>';
          return;
        }
        grid.innerHTML = data.map(img => {
          const { dateStr, timeStr } = imageDateTime(img);
          return `
            <div class="image-tile">
              <div class="ph viewable" style="height:140px;" data-img-id="${esc(img._id)}" title="Tap to view full size">
                <img src="${esc(img.imageUrl)}" alt="Your uploaded image" style="width:100%; height:100%; object-fit:cover;">
                <a class="dl-btn" href="${esc(img.imageUrl)}" download="${esc(imageDownloadName(img))}" title="Download" onclick="event.stopPropagation()">⬇</a>
              </div>
              <div class="meta">
                <span>${dateStr} • ${timeStr}</span>
                <p class="comment">"${esc(img.comment)}"</p>
              </div>
            </div>`;
        }).join('');

        grid.querySelectorAll('.ph.viewable').forEach(el => {
          el.addEventListener('click', () => openMyImagePreview(el.dataset.imgId));
        });
      } catch (err) {
        grid.innerHTML = `<p style="color:#e2574c; font-size:13px;">${esc(err.message || 'Could not load your images.')}</p>`;
      }
    }
  }
}

render('home');
