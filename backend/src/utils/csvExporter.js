/**
 * Utility for formatting data rows into RFC-4180 compliant CSV strings
 */

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert headers and rows to a downloadable CSV string
 * @param {Array<string>} headers - Header column titles
 * @param {Array<Array<any>>} rows - Array of value arrays
 * @returns {string} CSV formatted string
 */
function toCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map(r => r.map(escapeCsvField).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

module.exports = {
  escapeCsvField,
  toCsv
};
