const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getAssignedSubjects,
  uploadAttendance,
  getAttendanceHistory,
  getLectureAttendanceDetails,
  editAttendance,
  getSubjectStats,
  downloadReport
} = require('../controllers/teacherController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Supported Mime types and extensions for Excel and CSV
const ALLOWED_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv'
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// Multer storage with file type and size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only .xlsx, .xls, and .csv files are allowed.'), false);
    }
  }
});

// All routes are protected and restricted to teachers only
router.use(authenticateToken);
router.use(requireRoles(['TEACHER']));

router.get('/subjects', getAssignedSubjects);

// Wrap upload in custom handler to cleanly catch Multer/FileFilter errors
router.post('/attendance/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadAttendance);

router.get('/attendance/history', getAttendanceHistory);
router.get('/lectures/:lectureId/attendance', getLectureAttendanceDetails);
router.put('/lectures/:lectureId/attendance', editAttendance);
router.get('/subjects/:subjectId/stats', getSubjectStats);
router.get('/reports/subject/:subjectId', downloadReport);

module.exports = router;
