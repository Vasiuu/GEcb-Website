const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');

// ==========================================
// 1. TEACHER CRUD & ASSIGNMENTS
// ==========================================

async function getTeachers(req, res) {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      include: {
        department: true,
        teacherSubjects: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = teachers.map(t => ({
      id: t.id,
      username: t.username,
      name: t.name,
      departmentId: t.departmentId,
      department: t.department ? t.department.name : 'N/A',
      subjects: t.teacherSubjects.map(ts => ({
        id: ts.subject.id,
        name: ts.subject.name,
        code: ts.subject.code
      }))
    }));

    return res.status(200).json({ success: true, teachers: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch teachers.' });
  }
}

async function createTeacher(req, res) {
  try {
    const { username, name, password, departmentId } = req.body;

    if (!username || !name || !password) {
      return res.status(400).json({ error: 'Username, name, and password are required.' });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = await prisma.user.create({
      data: {
        username,
        name,
        password: hashedPassword,
        role: 'TEACHER',
        departmentId: departmentId ? parseInt(departmentId) : null
      }
    });

    return res.status(201).json({ success: true, teacher: { id: teacher.id, username: teacher.username, name: teacher.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create teacher.' });
  }
}

async function updateTeacher(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name, username, password, departmentId } = req.body;

    const dataToUpdate = {
      name,
      username,
      departmentId: departmentId ? parseInt(departmentId) : null
    };

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const teacher = await prisma.user.update({
      where: { id },
      data: dataToUpdate
    });

    return res.status(200).json({ success: true, teacher: { id: teacher.id, username: teacher.username, name: teacher.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update teacher.' });
  }
}

async function deleteTeacher(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete teacher.' });
  }
}

async function assignTeacherSubjects(req, res) {
  try {
    const teacherId = parseInt(req.body.teacherId);
    const subjectIds = req.body.subjectIds; // Array of integers

    if (!teacherId || !Array.isArray(subjectIds)) {
      return res.status(400).json({ error: 'Teacher ID and subject IDs array are required.' });
    }

    await prisma.$transaction([
      prisma.teacherSubject.deleteMany({ where: { teacherId } }),
      prisma.teacherSubject.createMany({
        data: subjectIds.map(subjectId => ({
          teacherId,
          subjectId: parseInt(subjectId)
        }))
      })
    ]);

    return res.status(200).json({ success: true, message: 'Subjects assigned successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to assign subjects.' });
  }
}

// ==========================================
// 2. DEPARTMENT CRUD
// ==========================================

async function getDepartments(req, res) {
  try {
    const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, departments: depts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch departments.' });
  }
}

async function createDepartment(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required.' });
    const dept = await prisma.department.create({ data: { name } });
    return res.status(201).json({ success: true, department: dept });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create department.' });
  }
}

async function updateDepartment(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    const dept = await prisma.department.update({ where: { id }, data: { name } });
    return res.status(200).json({ success: true, department: dept });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update department.' });
  }
}

async function deleteDepartment(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.department.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Department deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete department.' });
  }
}

// ==========================================
// 3. SEMESTER CRUD
// ==========================================

async function getSemesters(req, res) {
  try {
    const sems = await prisma.semester.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, semesters: sems });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch semesters.' });
  }
}

async function createSemester(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Semester name is required.' });
    const sem = await prisma.semester.create({ data: { name } });
    return res.status(201).json({ success: true, semester: sem });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create semester.' });
  }
}

async function updateSemester(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    const sem = await prisma.semester.update({ where: { id }, data: { name } });
    return res.status(200).json({ success: true, semester: sem });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update semester.' });
  }
}

async function deleteSemester(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.semester.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Semester deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete semester.' });
  }
}

// ==========================================
// 4. DIVISION CRUD
// ==========================================

async function getDivisions(req, res) {
  try {
    const divs = await prisma.division.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, divisions: divs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch divisions.' });
  }
}

async function createDivision(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Division name is required.' });
    const div = await prisma.division.create({ data: { name } });
    return res.status(201).json({ success: true, division: div });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create division.' });
  }
}

async function updateDivision(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    const div = await prisma.division.update({ where: { id }, data: { name } });
    return res.status(200).json({ success: true, division: div });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update division.' });
  }
}

async function deleteDivision(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.division.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Division deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete division.' });
  }
}

// ==========================================
// 5. SUBJECT CRUD
// ==========================================

async function getSubjects(req, res) {
  try {
    const subs = await prisma.subject.findMany({
      include: { department: true },
      orderBy: { name: 'asc' }
    });
    const result = subs.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      departmentId: s.departmentId,
      department: s.department.name
    }));
    return res.status(200).json({ success: true, subjects: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
}

async function createSubject(req, res) {
  try {
    const { name, code, departmentId } = req.body;
    if (!name || !code || !departmentId) return res.status(400).json({ error: 'Name, code, and department are required.' });
    const sub = await prisma.subject.create({
      data: { name, code, departmentId: parseInt(departmentId) }
    });
    return res.status(201).json({ success: true, subject: sub });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create subject.' });
  }
}

async function updateSubject(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name, code, departmentId } = req.body;
    const sub = await prisma.subject.update({
      where: { id },
      data: { name, code, departmentId: departmentId ? parseInt(departmentId) : undefined }
    });
    return res.status(200).json({ success: true, subject: sub });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update subject.' });
  }
}

async function deleteSubject(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.subject.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Subject deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete subject.' });
  }
}

// ==========================================
// 6. STUDENT CRUD
// ==========================================

async function getStudents(req, res) {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        department: true,
        semester: true,
        division: true
      },
      orderBy: { enrollment: 'asc' }
    });

    const result = students.map(s => ({
      id: s.id,
      userId: s.userId,
      enrollment: s.enrollment,
      name: s.user.name,
      username: s.user.username,
      departmentId: s.departmentId,
      department: s.department.name,
      semesterId: s.semesterId,
      semester: s.semester.name,
      divisionId: s.divisionId,
      division: s.division.name
    }));

    return res.status(200).json({ success: true, students: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch students.' });
  }
}

async function createStudent(req, res) {
  try {
    const { enrollment, name, password, departmentId, semesterId, divisionId } = req.body;

    if (!enrollment || !name || !password || !departmentId || !semesterId || !divisionId) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const exists = await prisma.user.findUnique({ where: { username: enrollment } });
    if (exists) {
      return res.status(400).json({ error: 'Student with this username/enrollment already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const transaction = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: enrollment,
          name,
          password: hashedPassword,
          role: 'STUDENT',
          departmentId: parseInt(departmentId)
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          enrollment,
          departmentId: parseInt(departmentId),
          semesterId: parseInt(semesterId),
          divisionId: parseInt(divisionId)
        }
      });

      return student;
    });

    return res.status(201).json({ success: true, student: transaction });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create student.' });
  }
}

async function updateStudent(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name, password, departmentId, semesterId, divisionId } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const userUpdate = { name };
    if (password) {
      userUpdate.password = await bcrypt.hash(password, 10);
    }
    if (departmentId) {
      userUpdate.departmentId = parseInt(departmentId);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.userId },
        data: userUpdate
      }),
      prisma.student.update({
        where: { id },
        data: {
          departmentId: departmentId ? parseInt(departmentId) : undefined,
          semesterId: semesterId ? parseInt(semesterId) : undefined,
          divisionId: divisionId ? parseInt(divisionId) : undefined
        }
      })
    ]);

    return res.status(200).json({ success: true, message: 'Student updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update student.' });
  }
}

async function deleteStudent(req, res) {
  try {
    const id = parseInt(req.params.id);
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    
    // Deleting the user will cascade delete the student due to onDelete: Cascade
    await prisma.user.delete({ where: { id: student.userId } });
    return res.status(200).json({ success: true, message: 'Student deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete student.' });
  }
}

// ==========================================
// 7. GLOBAL REPORTS & LOGS
// ==========================================

async function getAllAttendanceSummary(req, res) {
  try {
    const lectures = await prisma.lecture.findMany({
      include: {
        subject: true,
        department: true,
        semester: true,
        division: true,
        teacher: true,
        attendances: true
      },
      orderBy: { date: 'desc' }
    });

    const result = lectures.map(l => {
      const stats = { PRESENT: 0, ABSENT: 0, LEAVE: 0, MEDICAL_OD: 0 };
      l.attendances.forEach(a => {
        if (stats[a.status] !== undefined) stats[a.status]++;
      });

      return {
        id: l.id,
        date: l.date.toISOString().split('T')[0],
        lectureNumber: l.lectureNumber,
        subject: l.subject.name,
        teacher: l.teacher.name,
        department: l.department.name,
        semester: l.semester.name,
        division: l.division.name,
        stats
      };
    });

    return res.status(200).json({ success: true, history: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch global attendance.' });
  }
}

async function downloadGlobalReport(req, res) {
  try {
    const lectures = await prisma.lecture.findMany({
      include: {
        subject: true,
        department: true,
        semester: true,
        division: true,
        teacher: true,
        attendances: true
      },
      orderBy: { date: 'desc' }
    });

    const wb = xlsx.utils.book_new();

    const dataRows = [];
    const headers = ['Date', 'Lecture #', 'Subject', 'Teacher', 'Department', 'Semester', 'Division', 'Present', 'Absent', 'Leave', 'Medical/OD', 'Total Students', 'Attendance %'];

    lectures.forEach(l => {
      const stats = { PRESENT: 0, ABSENT: 0, LEAVE: 0, MEDICAL_OD: 0 };
      l.attendances.forEach(a => {
        if (stats[a.status] !== undefined) stats[a.status]++;
      });

      const total = l.attendances.length;
      const rate = total > 0 ? `${Math.round((stats.PRESENT / total) * 100)}%` : '0%';

      dataRows.push([
        l.date.toISOString().split('T')[0],
        l.lectureNumber,
        l.subject.name,
        l.teacher.name,
        l.department.name,
        l.semester.name,
        l.division.name,
        stats.PRESENT,
        stats.ABSENT,
        stats.LEAVE,
        stats.MEDICAL_OD,
        total,
        rate
      ]);
    });

    const ws = xlsx.utils.aoa_to_sheet([headers, ...dataRows]);
    xlsx.utils.book_append_sheet(wb, ws, 'Global Attendance Report');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="global_attendance_report.xlsx"');
    
    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate global report.' });
  }
}

module.exports = {
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
};
