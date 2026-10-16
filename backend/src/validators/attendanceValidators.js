function validateCreateSession(req, res, next) {
  const { subjectId, sessionDate, startTime, endTime } = req.body;

  if (!subjectId || isNaN(parseInt(subjectId, 10))) {
    return res.status(400).json({ success: false, message: 'Valid subject ID is required' });
  }

  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return res.status(400).json({ success: false, message: 'Valid session date is required in YYYY-MM-DD format' });
  }

  if (!startTime || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
    return res.status(400).json({ success: false, message: 'Valid start time is required in HH:MM or HH:MM:SS format' });
  }

  if (!endTime || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) {
    return res.status(400).json({ success: false, message: 'Valid end time is required in HH:MM or HH:MM:SS format' });
  }

  next();
}

function validateMarkAttendance(req, res, next) {
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Attendance records array is required and must contain at least one student record'
    });
  }

  const validStatuses = ['present', 'absent', 'late'];

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    if (!item.studentId || isNaN(parseInt(item.studentId, 10))) {
      return res.status(400).json({
        success: false,
        message: `Invalid studentId at record index ${i}`
      });
    }

    if (!item.status || !validStatuses.includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid attendance status "${item.status}" at record index ${i}. Allowed: present, absent, late`
      });
    }
  }

  next();
}

function validateUpdateRecord(req, res, next) {
  const { status } = req.body;
  const validStatuses = ['present', 'absent', 'late'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid attendance status "${status}". Allowed: present, absent, late`
    });
  }

  next();
}

module.exports = {
  validateCreateSession,
  validateMarkAttendance,
  validateUpdateRecord
};
