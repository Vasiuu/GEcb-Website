const prisma = require('../config/db');

async function getStudentDashboard(req, res) {
  try {
    const userId = req.user.id;

    // Find student info
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        department: true,
        semester: true,
        division: true,
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    // Get all attendance records for this student
    const attendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: {
        lecture: {
          include: {
            subject: true
          }
        }
      }
    });

    // 1. Calculate overall stats
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalMedical = 0;

    attendances.forEach(a => {
      if (a.status === 'PRESENT') totalPresent++;
      else if (a.status === 'ABSENT') totalAbsent++;
      else if (a.status === 'LEAVE') totalLeave++;
      else if (a.status === 'MEDICAL_OD') totalMedical++;
    });

    const totalLectures = attendances.length;
    const attendancePercentage = totalLectures > 0 
      ? Math.round((totalPresent / totalLectures) * 100 * 10) / 10 
      : 0;

    // 2. Subject-wise attendance calculation
    const subjectStatsMap = {};
    attendances.forEach(a => {
      const sub = a.lecture.subject;
      if (!subjectStatsMap[sub.id]) {
        subjectStatsMap[sub.id] = {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          total: 0,
          present: 0
        };
      }
      subjectStatsMap[sub.id].total++;
      if (a.status === 'PRESENT') {
        subjectStatsMap[sub.id].present++;
      }
    });

    // If there are other subjects taught in the department that this student hasn't attended yet, 
    // we can retrieve them and list with 0%
    const allDeptSubjects = await prisma.subject.findMany({
      where: { departmentId: student.departmentId }
    });

    allDeptSubjects.forEach(sub => {
      if (!subjectStatsMap[sub.id]) {
        subjectStatsMap[sub.id] = {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          total: 0,
          present: 0
        };
      }
    });

    const subjectWiseAttendance = Object.values(subjectStatsMap).map(item => ({
      ...item,
      percentage: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0
    }));

    // 3. Dynamic Mock Data for Library and Submissions
    // This populates the UI with matching values while maintaining full REST API capability
    const libraryBooks = [
      {
        title: 'Mechanical Vibrations',
        author: 'Singiresu S. Rao',
        dueDate: '15 OCT 2026',
        status: 'On-Time',
        badgeClass: 'bg-primary-container text-white',
        overdue: false
      },
      {
        title: 'Applied Thermodynamics',
        author: 'P.K. Nag',
        dueDate: '24 JUL 2026',
        status: 'OVERDUE (2 DAYS)',
        badgeClass: 'bg-error-container text-error font-bold',
        overdue: true
      }
    ];

    const submissions = [
      {
        id: 1,
        title: 'Machine Design Unit 2',
        description: 'Focus on gear geometry and fatigue analysis.',
        status: 'Graded: A+',
        statusClass: 'bg-green-100 text-green-700',
        dateLabel: 'Submitted: Sep 28',
        footerIcon: 'task_alt',
        footerText: 'Verified'
      },
      {
        id: 2,
        title: 'Internal Combustion Engines',
        description: 'Lab Journal: Performance test on single cylinder diesel engine.',
        status: 'Pending',
        statusClass: 'bg-secondary-container text-on-secondary-container',
        dateLabel: 'Due: Oct 12, 11:59 PM',
        footerIcon: 'science',
        footerText: 'Upload PDF'
      },
      {
        id: 3,
        title: 'Industrial Engineering Report',
        description: 'Case study analysis on Lean Manufacturing systems.',
        status: 'Under Review',
        statusClass: 'bg-surface-container-high text-on-surface-variant',
        dateLabel: 'Submitted: Oct 02',
        footerIcon: 'description',
        footerText: 'Faculty: Prof. J. Joshi'
      }
    ];

    const labPerformance = {
      overallLabAttendance: 86,
      totalCompleted: 12,
      totalExpected: 14,
      labs: [
        { name: 'ICE Lab', completed: 4, total: 4, percentage: 100 },
        { name: 'Dynamics Lab', completed: 3, total: 4, percentage: 75 },
        { name: 'HVAC Systems', completed: 3, total: 3, percentage: 100 },
        { name: 'CAM Lab', completed: 2, total: 3, percentage: 66 }
      ]
    };

    return res.status(200).json({
      success: true,
      studentProfile: {
        id: student.id,
        enrollment: student.enrollment,
        name: student.user.name,
        department: student.department.name,
        semester: student.semester.name,
        division: student.division.name
      },
      stats: {
        attendancePercentage,
        totalLectures,
        totalPresent,
        totalAbsent,
        totalLeave,
        totalMedical,
        chartData: {
          present: totalPresent,
          absent: totalAbsent,
          leave: totalLeave,
          medical: totalMedical
        }
      },
      subjectWiseAttendance,
      libraryBooks,
      submissions,
      labPerformance
    });

  } catch (err) {
    console.error('getStudentDashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getStudentDashboard
};
