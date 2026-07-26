const express = require('express');
const multer = require('multer');
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

// Multer memory storage configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All routes are protected and restricted to teachers only
router.use(authenticateToken);
router.use(requireRoles(['TEACHER']));

router.get('/subjects', getAssignedSubjects);
router.post('/attendance/upload', upload.single('file'), uploadAttendance);
router.get('/attendance/history', getAttendanceHistory);
router.get('/lectures/:lectureId/attendance', getLectureAttendanceDetails);
router.put('/lectures/:lectureId/attendance', editAttendance);
router.get('/subjects/:subjectId/stats', getSubjectStats);
router.get('/reports/subject/:subjectId', downloadReport);

module.exports = router;
