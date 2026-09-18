/**
 * Excel (.xlsx) export helper.
 *
 * Uses SheetJS (the `XLSX` global, loaded via CDN in admin.html) so no
 * bundler or backend dependency is needed - everything happens client-side
 * from data already fetched from the API.
 */

/**
 * @param {Array<Object>} rows    Plain objects; each key becomes a column header.
 * @param {Object} opts
 * @param {string} opts.filename  Download filename, e.g. "duty_places.xlsx".
 * @param {string} [opts.sheetName]
 */
function exportRowsToExcel(rows, { filename, sheetName = 'Sheet1' } = {}) {
  if (typeof XLSX === 'undefined') {
    alert('The Excel export library did not load. Check your internet connection and try again.');
    return;
  }
  if (!rows || !rows.length) {
    alert('Nothing to export.');
    return;
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * PDF export helper.
 *
 * Uses jsPDF + the jspdf-autotable plugin (both the `jspdf` global, loaded
 * via CDN in admin.html) so no bundler or backend dependency is needed -
 * everything happens client-side from data already fetched from the API.
 *
 * @param {Array<Object>} columns  [{ header: 'Guard', key: 'guard' }, ...]
 * @param {Array<Object>} rows     Plain objects keyed to match `columns[].key`.
 * @param {Object} opts
 * @param {string} opts.filename   Download filename, e.g. "duties.pdf".
 * @param {string} [opts.title]    Optional heading printed above the table.
 */
function exportRowsToPdf(columns, rows, { filename, title } = {}) {
  if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
    alert('The PDF export library did not load. Check your internet connection and try again.');
    return;
  }
  if (!rows || !rows.length) {
    alert('Nothing to export.');
    return;
  }

  const doc = new jspdf.jsPDF({ orientation: 'landscape' });
  let startY = 10;
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    startY = 22;
  }

  doc.autoTable({
    startY,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => (r[c.key] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [18, 33, 58] },
  });

  doc.save(filename);
}
