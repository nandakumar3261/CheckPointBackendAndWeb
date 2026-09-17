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
