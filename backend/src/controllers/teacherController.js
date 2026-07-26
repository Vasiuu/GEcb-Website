const prisma = require('../config/db');
const { parseAttendanceExcel } = require('../utils/excelParser');
const xlsx = require('xlsx');

// 1. Get subjects assigned to the logged-in teacher
async function getAssignedSubjects(req, res) {
  try {
    const teacherId = req.user.id;
    const assignments = await prisma.teacherSubject.findMany({
      where: { teacherId },
      include: {
        subject: {
          include: {
            department: true
          }
        }
      }
    });

    const subjects = assignments.map(a => ({
      id: a.subject.id,
      name: a.subject.name,
      code: a.subject.code,
      department: a.subject.department.name,
      departmentId: a.subject.departmentId
    }));

    return res.status(200).json({ success: true, subjects });
  } catch (err) {
    console.error('getAssignedSubjects error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 2. Upload Excel attendance sheet and store it in PostgreSQL
async function uploadAttendance(req, res) {
  try {
    const teacherId = req.user.id;
    const { subjectId, departmentId, semesterId, divisionId, date, lectureNumber } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Excel file' });
    }

    if (!subjectId || !departmentId || !semesterId || !divisionId || !date || !lectureNumber) {
      return res.status(400).json({ error: 'All fields (subject, department, semester, division, date, lecture number) are required.' });
    }

    const subId = parseInt(subjectId);
    const depId = parseInt(departmentId);
    const semId = parseInt(semesterId);
    const divId = parseInt(divisionId);
    const lecNum = parseInt(lectureNumber);
    const parsedDate = new Date(date);

    // Verify teacher is assigned to this subject
    const isAssigned = await prisma.teacherSubject.findFirst({
      where: { teacherId, subjectId: subId }
    });

    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to teach this subject.' });
    }

    // Parse Excel File
    const { parsedData, errors } = parseAttendanceExcel(req.file.buffer);
    if (errors.length > 0 && parsedData.length === 0) {
      return res.status(400).json({ error: 'Excel parsing failed', details: errors });
    }

    // Load all students in the selected Department, Semester, and Division to validate
    const targetStudents = await prisma.student.findMany({
      where: {
        departmentId: depId,
        semesterId: semId,
        divisionId: divId
      },
      include: {
        user: true
      }
    });

    if (targetStudents.length === 0) {
      return res.status(400).json({ error: 'No students found in the selected Department, Semester, and Division in database.' });
    }

    // Match Excel rows to Database students
    const studentMap = {};
    targetStudents.forEach(student => {
      studentMap[student.enrollment.toLowerCase().trim()] = student.id;
    });

    const attendanceRecordsToCreate = [];
    const unmatchedEnrollments = [];

    parsedData.forEach(row => {
      const cleanEnroll = row.enrollment.toLowerCase().trim();
      const studentId = studentMap[cleanEnroll];
      if (studentId) {
        attendanceRecordsToCreate.push({
          studentId,
          status: row.status
        });
      } else {
        unmatchedEnrollments.push(`Row ${row.rowNum} (Enrollment: ${row.enrollment})`);
      }
    });

    // If there are unmatched students and we want strict validation, we can warn the user.
    // Let's return a detailed message if too many students are unmatched
    if (attendanceRecordsToCreate.length === 0) {
      return res.status(400).json({ 
        error: 'None of the students in the Excel file matched the database for the selected department/semester/division.',
        details: unmatchedEnrollments 
      });
    }

    // Database transaction: Create or replace the lecture and attendance records
    const transaction = await prisma.$transaction(async (tx) => {
      // Find or create lecture
      // Date normalized to midnight to avoid timestamp mismatches
      const normalizedDate = new Date(parsedDate.toDateString());

      let lecture = await tx.lecture.findFirst({
        where: {
          subjectId: subId,
          departmentId: depId,
          semesterId: semId,
          divisionId: divId,
          date: normalizedDate,
          lectureNumber: lecNum
        }
      });

      if (lecture) {
        // If lecture already exists, delete previous attendance records to overwrite
        await tx.attendance.deleteMany({
          where: { lectureId: lecture.id }
        });
      } else {
        // Create new lecture record
        lecture = await tx.lecture.create({
          data: {
            subjectId: subId,
            departmentId: depId,
            semesterId: semId,
            divisionId: divId,
            date: normalizedDate,
            lectureNumber: lecNum,
            teacherId
          }
        });
      }

      // Create attendance records
      const attendanceData = attendanceRecordsToCreate.map(record => ({
        lectureId: lecture.id,
        studentId: record.studentId,
        status: record.status
      }));

      await tx.attendance.createMany({
        data: attendanceData
      });

      return { lecture, recordsCount: attendanceData.length };
    });

    return res.status(200).json({
      success: true,
      message: `Successfully processed attendance for ${transaction.recordsCount} students.`,
      warnings: unmatchedEnrollments.length > 0 ? unmatchedEnrollments : null,
      lectureId: transaction.lecture.id
    });

  } catch (err) {
    console.error('uploadAttendance error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

// 3. Get list of lectures conducted by this teacher
async function getAttendanceHistory(req, res) {
  try {
    const teacherId = req.user.id;
    const { subjectId } = req.query;

    const whereClause = { teacherId };
    if (subjectId) {
      whereClause.subjectId = parseInt(subjectId);
    }

    const lectures = await prisma.lecture.findMany({
      where: whereClause,
      include: {
        subject: true,
        department: true,
        semester: true,
        division: true,
        attendances: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    const history = lectures.map(l => {
      const stats = { PRESENT: 0, ABSENT: 0, LEAVE: 0, MEDICAL_OD: 0 };
      l.attendances.forEach(a => {
        if (stats[a.status] !== undefined) stats[a.status]++;
      });

      return {
        id: l.id,
        date: l.date.toISOString().split('T')[0],
        lectureNumber: l.lectureNumber,
        subject: l.subject.name,
        subjectCode: l.subject.code,
        department: l.department.name,
        semester: l.semester.name,
        division: l.division.name,
        stats
      };
    });

    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error('getAttendanceHistory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 4. Get individual student attendance details for a specific lecture
async function getLectureAttendanceDetails(req, res) {
  try {
    const lectureId = parseInt(req.params.lectureId);

    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      include: {
        subject: true,
        department: true,
        semester: true,
        division: true,
        attendances: {
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }

    const students = lecture.attendances.map(a => ({
      attendanceId: a.id,
      studentId: a.student.id,
      enrollment: a.student.enrollment,
      name: a.student.user.name,
      status: a.status
    }));

    return res.status(200).json({
      success: true,
      lecture: {
        id: lecture.id,
        date: lecture.date.toISOString().split('T')[0],
        lectureNumber: lecture.lectureNumber,
        subject: lecture.subject.name,
        subjectCode: lecture.subject.code,
        department: lecture.department.name,
        semester: lecture.semester.name,
        division: lecture.division.name
      },
      students
    });
  } catch (err) {
    console.error('getLectureAttendanceDetails error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 5. Edit student attendance details for a lecture
async function editAttendance(req, res) {
  try {
    const lectureId = parseInt(req.params.lectureId);
    const { students } = req.body; // Array of { studentId, status }

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Invalid students list.' });
    }

    await prisma.$transaction(
      students.map(item => prisma.attendance.upsert({
        where: {
          lectureId_studentId: {
            lectureId,
            studentId: parseInt(item.studentId)
          }
        },
        update: {
          status: item.status
        },
        create: {
          lectureId,
          studentId: parseInt(item.studentId),
          status: item.status
        }
      }))
    );

    return res.status(200).json({ success: true, message: 'Attendance records updated successfully.' });
  } catch (err) {
    console.error('editAttendance error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

// 6. Get cumulative statistics for a selected subject
async function getSubjectStats(req, res) {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const teacherId = req.user.id;

    // Verify teacher owns the subject
    const isAssigned = await prisma.teacherSubject.findFirst({
      where: { teacherId, subjectId }
    });

    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied. You do not teach this subject.' });
    }

    // Get all lectures conducted for this subject
    const lectures = await prisma.lecture.findMany({
      where: { subjectId },
      include: {
        attendances: true
      }
    });

    const totalLecturesConducted = lectures.length;

    // Get total students assigned to this subject
    // We assume the subject is assigned to departments/semesters. 
    // Let's find distinct department/semester/division combinations where this teacher conducted lectures,
    // and count the enrolled students.
    // Or simpler: count distinct students who have AT LEAST one attendance record in this subject.
    // Alternatively: fetch all students belonging to the department & semester of the subject.
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    
    // Let's count students in the department of this subject
    const totalStudents = await prisma.student.count({
      where: {
        departmentId: subject.departmentId
      }
    });

    // Count present/absent breakdown
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalMedical = 0;

    lectures.forEach(l => {
      l.attendances.forEach(a => {
        if (a.status === 'PRESENT') totalPresent++;
        if (a.status === 'ABSENT') totalAbsent++;
        if (a.status === 'LEAVE') totalLeave++;
        if (a.status === 'MEDICAL_OD') totalMedical++;
      });
    });

    // Stats for "Today's" or the most recent lecture
    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;
    let medicalToday = 0;

    if (totalLecturesConducted > 0) {
      // Find the most recent lecture
      const sortedLectures = [...lectures].sort((a, b) => b.date.getTime() - a.date.getTime());
      const latestLecture = sortedLectures[0];
      
      latestLecture.attendances.forEach(a => {
        if (a.status === 'PRESENT') presentToday++;
        if (a.status === 'ABSENT') absentToday++;
        if (a.status === 'LEAVE') leaveToday++;
        if (a.status === 'MEDICAL_OD') medicalToday++;
      });
    }

    const totalAttendanceHits = totalPresent + totalAbsent + totalLeave + totalMedical;
    const attendancePercentage = totalAttendanceHits > 0 
      ? Math.round((totalPresent / totalAttendanceHits) * 100 * 10) / 10 
      : 0;

    return res.status(200).json({
      success: true,
      subjectName: subject.name,
      stats: {
        totalStudents,
        presentToday,
        absentToday,
        leaveToday,
        medicalToday,
        attendancePercentage,
        totalLecturesConducted,
        chartData: {
          present: totalPresent,
          absent: totalAbsent,
          leave: totalLeave,
          medical: totalMedical
        }
      }
    });

  } catch (err) {
    console.error('getSubjectStats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 7. Download attendance sheet as Excel report
async function downloadReport(req, res) {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const teacherId = req.user.id;

    // Verify teacher owns the subject
    const isAssigned = await prisma.teacherSubject.findFirst({
      where: { teacherId, subjectId }
    });

    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied. You do not teach this subject.' });
    }

    // Get subject details
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { department: true }
    });

    // Fetch all lectures and attendances for this subject
    const lectures = await prisma.lecture.findMany({
      where: { subjectId },
      include: {
        attendances: {
          include: {
            student: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Fetch all students in the subject's department to construct the sheet structure
    const students = await prisma.student.findMany({
      where: { departmentId: subject.departmentId },
      include: { user: true }
    });

    // Create Excel Workbook
    const wb = xlsx.utils.book_new();
    
    // Matrix: Rows = Students, Columns = Dates of lectures
    // Headers: [Enrollment, Student Name, ...Dates, Present Count, Percentage]
    const header = ['Enrollment', 'Name'];
    lectures.forEach(l => {
      const dateStr = `${l.date.toISOString().split('T')[0]} (L${l.lectureNumber})`;
      header.push(dateStr);
    });
    header.push('Total Present');
    header.push('Attendance %');

    const dataRows = [];

    students.forEach(student => {
      const row = [student.enrollment, student.user.name];
      let presentCount = 0;
      let totalLecs = 0;

      lectures.forEach(lecture => {
        const attendance = lecture.attendances.find(a => a.studentId === student.id);
        if (attendance) {
          totalLecs++;
          if (attendance.status === 'PRESENT') {
            row.push('P');
            presentCount++;
          } else if (attendance.status === 'ABSENT') {
            row.push('A');
          } else if (attendance.status === 'LEAVE') {
            row.push('L');
          } else {
            row.push('M');
          }
        } else {
          row.push('-'); // Not registered for this lecture
        }
      });

      const percentage = totalLecs > 0 ? `${Math.round((presentCount / totalLecs) * 100)}%` : '0%';
      row.push(presentCount);
      row.push(percentage);
      dataRows.push(row);
    });

    const wsData = [header, ...dataRows];
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    // Apply basic worksheet properties
    xlsx.utils.book_append_sheet(wb, ws, 'Attendance Summary');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${subject.name.replace(/\s+/g, '_')}.xlsx"`);
    
    return res.send(buffer);
  } catch (err) {
    console.error('downloadReport error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getAssignedSubjects,
  uploadAttendance,
  getAttendanceHistory,
  getLectureAttendanceDetails,
  editAttendance,
  getSubjectStats,
  downloadReport
};
