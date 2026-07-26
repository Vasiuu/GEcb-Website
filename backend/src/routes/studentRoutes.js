const express = require('express');
const { getStudentDashboard } = require('../controllers/studentController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticateToken, requireRoles(['STUDENT']), getStudentDashboard);

module.exports = router;
