const express = require('express');
const {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignTeacherSubjects,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  getDivisions,
  createDivision,
  updateDivision,
  deleteDivision,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllAttendanceSummary,
  downloadGlobalReport
} = require('../controllers/adminController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Protect all routes under admin path
router.use(authenticateToken);

// Teacher CRUD & Subject Assignment
router.get('/teachers', requireRoles(['ADMIN']), getTeachers);
router.post('/teachers', requireRoles(['ADMIN']), createTeacher);
router.put('/teachers/:id', requireRoles(['ADMIN']), updateTeacher);
router.delete('/teachers/:id', requireRoles(['ADMIN']), deleteTeacher);
router.post('/teachers/assign', requireRoles(['ADMIN']), assignTeacherSubjects);

// Department CRUD
router.get('/departments', requireRoles(['ADMIN', 'TEACHER']), getDepartments);
router.post('/departments', requireRoles(['ADMIN']), createDepartment);
router.put('/departments/:id', requireRoles(['ADMIN']), updateDepartment);
router.delete('/departments/:id', requireRoles(['ADMIN']), deleteDepartment);

// Semester CRUD
router.get('/semesters', requireRoles(['ADMIN', 'TEACHER']), getSemesters);
router.post('/semesters', requireRoles(['ADMIN']), createSemester);
router.put('/semesters/:id', requireRoles(['ADMIN']), updateSemester);
router.delete('/semesters/:id', requireRoles(['ADMIN']), deleteSemester);

// Division CRUD
router.get('/divisions', requireRoles(['ADMIN', 'TEACHER']), getDivisions);
router.post('/divisions', requireRoles(['ADMIN']), createDivision);
router.put('/divisions/:id', requireRoles(['ADMIN']), updateDivision);
router.delete('/divisions/:id', requireRoles(['ADMIN']), deleteDivision);

// Subject CRUD
router.get('/subjects', requireRoles(['ADMIN', 'TEACHER']), getSubjects);
router.post('/subjects', requireRoles(['ADMIN']), createSubject);
router.put('/subjects/:id', requireRoles(['ADMIN']), updateSubject);
router.delete('/subjects/:id', requireRoles(['ADMIN']), deleteSubject);

// Student CRUD
router.get('/students', requireRoles(['ADMIN']), getStudents);
router.post('/students', requireRoles(['ADMIN']), createStudent);
router.put('/students/:id', requireRoles(['ADMIN']), updateStudent);
router.delete('/students/:id', requireRoles(['ADMIN']), deleteStudent);

// Global Reports & Summaries
router.get('/attendance/summary', requireRoles(['ADMIN']), getAllAttendanceSummary);
router.get('/reports/global', requireRoles(['ADMIN']), downloadGlobalReport);

module.exports = router;
