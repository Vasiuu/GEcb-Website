const xlsx = require('xlsx');

/**
 * Parses attendance data from an Excel file buffer.
 * It looks for columns matching "enrollment" or "roll" and "status" or "attendance".
 * Status is normalized into: PRESENT, ABSENT, LEAVE, MEDICAL_OD.
 * 
 * @param {Buffer} fileBuffer - Multer file buffer
 * @returns {Object} { parsedData: Array, errors: Array }
 */
function parseAttendanceExcel(fileBuffer) {
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    if (!workbook.SheetNames.length) {
      return { parsedData: [], errors: ['Excel file has no sheets.'] };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const parsedData = [];
    const errors = [];

    rows.forEach((row, index) => {
      let enrollment = null;
      let status = null;

      // Find matching keys
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim().toLowerCase();
        if (
          cleanKey.includes('enrollment') || 
          cleanKey.includes('roll') || 
          cleanKey.includes('student id') ||
          cleanKey === 'enrolment'
        ) {
          enrollment = String(row[key]).trim();
        }
        if (
          cleanKey.includes('status') || 
          cleanKey.includes('attendance') || 
          cleanKey.includes('present') ||
          cleanKey === 'val'
        ) {
          status = String(row[key]).trim().toUpperCase();
        }
      });

      // Validation
      const rowNumber = index + 2; // 1-indexed header + row index offset
      if (!enrollment) {
        errors.push(`Row ${rowNumber}: Enrollment column not found or empty.`);
        return;
      }

      if (!status) {
        errors.push(`Row ${rowNumber} (Enrollment: ${enrollment}): Attendance status column not found or empty.`);
        return;
      }

      let normalizedStatus = null;
      if (status === 'P' || status === 'PRESENT' || status === '1') {
        normalizedStatus = 'PRESENT';
      } else if (status === 'A' || status === 'ABSENT' || status === '0') {
        normalizedStatus = 'ABSENT';
      } else if (status === 'L' || status === 'LEAVE') {
        normalizedStatus = 'LEAVE';
      } else if (
        status === 'M' || 
        status === 'MEDICAL' || 
        status === 'OD' || 
        status === 'MEDICAL/OD' || 
        status === 'MEDICAL_OD'
      ) {
        normalizedStatus = 'MEDICAL_OD';
      } else {
        errors.push(`Row ${rowNumber} (Enrollment: ${enrollment}): Invalid status '${status}'. Must be Present, Absent, Leave, or Medical/OD.`);
        return;
      }

      parsedData.push({
        enrollment,
        status: normalizedStatus,
        rowNum: rowNumber
      });
    });

    return { parsedData, errors };
  } catch (err) {
    return { parsedData: [], errors: [`Failed to parse Excel file: ${err.message}`] };
  }
}

module.exports = { parseAttendanceExcel };
