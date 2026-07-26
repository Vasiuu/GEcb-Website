const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database started...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const teacher1Password = await bcrypt.hash('teacher123', 10);
  const teacher2Password = await bcrypt.hash('teacher234', 10);
  const student1Password = await bcrypt.hash('0000', 10);
  const student2Password = await bcrypt.hash('student123', 10);
  const student3Password = await bcrypt.hash('student123', 10);

  // 1. Create Departments
  const deptElectrical = await prisma.department.upsert({
    where: { name: 'Electrical Engineering' },
    update: {},
    create: { name: 'Electrical Engineering' },
  });

  const deptComputer = await prisma.department.upsert({
    where: { name: 'Computer Engineering' },
    update: {},
    create: { name: 'Computer Engineering' },
  });

  const deptMechanical = await prisma.department.upsert({
    where: { name: 'Mechanical Engineering' },
    update: {},
    create: { name: 'Mechanical Engineering' },
  });

  // 2. Create Semesters
  const semesters = [];
  for (let i = 1; i <= 8; i++) {
    const sem = await prisma.semester.upsert({
      where: { name: `Sem-${i}` },
      update: {},
      create: { name: `Sem-${i}` },
    });
    semesters.push(sem);
  }
  const sem6 = semesters[5]; // Sem-6

  // 3. Create Divisions
  const divA = await prisma.division.upsert({
    where: { name: 'A' },
    update: {},
    create: { name: 'A' },
  });

  const divB = await prisma.division.upsert({
    where: { name: 'B' },
    update: {},
    create: { name: 'B' },
  });

  // 4. Create Subjects
  const subPE = await prisma.subject.upsert({
    where: { code: 'PE101' },
    update: {},
    create: {
      name: 'Power Electronics',
      code: 'PE101',
      departmentId: deptElectrical.id,
    },
  });

  const subEMFT = await prisma.subject.upsert({
    where: { code: 'EMFT102' },
    update: {},
    create: {
      name: 'Electromagnetic Field Theory',
      code: 'EMFT102',
      departmentId: deptElectrical.id,
    },
  });

  const subEM = await prisma.subject.upsert({
    where: { code: 'EM103' },
    update: {},
    create: {
      name: 'Electrical Machines',
      code: 'EM103',
      departmentId: deptElectrical.id,
    },
  });

  const subCS = await prisma.subject.upsert({
    where: { code: 'CS104' },
    update: {},
    create: {
      name: 'Control Systems',
      code: 'CS104',
      departmentId: deptElectrical.id,
    },
  });

  const subPS = await prisma.subject.upsert({
    where: { code: 'PS105' },
    update: {},
    create: {
      name: 'Power Systems',
      code: 'PS105',
      departmentId: deptElectrical.id,
    },
  });

  // 5. Create Users
  // Admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: adminPassword },
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'Dr. Admin User',
      role: 'ADMIN',
    },
  });

  // Teacher 1
  const teacher1 = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: { password: teacher1Password },
    create: {
      username: 'teacher1',
      password: teacher1Password,
      name: 'Prof. Rajesh Kumar',
      role: 'TEACHER',
      departmentId: deptElectrical.id,
    },
  });

  // Teacher 2
  const teacher2 = await prisma.user.upsert({
    where: { username: 'teacher2' },
    update: { password: teacher2Password },
    create: {
      username: 'teacher2',
      password: teacher2Password,
      name: 'Prof. Anjali Sharma',
      role: 'TEACHER',
      departmentId: deptElectrical.id,
    },
  });

  // Students (as Users + Students)
  const studentUsersData = [
    { username: '240153109018', name: 'Vasu Pathak', password: student1Password, enrollment: '240153109018' },
    { username: '210150111002', name: 'Priya Sharma', password: student2Password, enrollment: '210150111002' },
    { username: '220010111001', name: 'Raj Patel', password: student3Password, enrollment: '220010111001' },
  ];

  const studentRecords = [];
  for (const stu of studentUsersData) {
    const user = await prisma.user.upsert({
      where: { username: stu.username },
      update: { password: stu.password },
      create: {
        username: stu.username,
        password: stu.password,
        name: stu.name,
        role: 'STUDENT',
        departmentId: deptElectrical.id,
      },
    });

    const student = await prisma.student.upsert({
      where: { enrollment: stu.enrollment },
      update: {},
      create: {
        userId: user.id,
        enrollment: stu.enrollment,
        departmentId: deptElectrical.id,
        semesterId: sem6.id,
        divisionId: divA.id,
      },
    });
    studentRecords.push(student);
  }

  // 6. Assign Subjects to Teachers
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher1.id, subjectId: subPE.id } },
    update: {},
    create: { teacherId: teacher1.id, subjectId: subPE.id },
  });

  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher1.id, subjectId: subEM.id } },
    update: {},
    create: { teacherId: teacher1.id, subjectId: subEM.id },
  });

  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher2.id, subjectId: subEMFT.id } },
    update: {},
    create: { teacherId: teacher2.id, subjectId: subEMFT.id },
  });

  // 7. Seed Dummy Lectures and Attendance to give realistic statistics
  // Let's seed 10 lectures for Power Electronics (Teacher 1)
  const today = new Date();
  for (let l = 1; l <= 10; l++) {
    const lectureDate = new Date();
    lectureDate.setDate(today.getDate() - (10 - l)); // 10 days ago to today

    const lecture = await prisma.lecture.upsert({
      where: {
        subjectId_departmentId_semesterId_divisionId_date_lectureNumber: {
          subjectId: subPE.id,
          departmentId: deptElectrical.id,
          semesterId: sem6.id,
          divisionId: divA.id,
          date: new Date(lectureDate.toDateString()),
          lectureNumber: 1,
        }
      },
      update: {},
      create: {
        subjectId: subPE.id,
        departmentId: deptElectrical.id,
        semesterId: sem6.id,
        divisionId: divA.id,
        date: new Date(lectureDate.toDateString()),
        lectureNumber: 1,
        teacherId: teacher1.id,
      }
    });

    // Student 1 (Vasu Pathak) - 90% attendance (present in 9/10)
    await prisma.attendance.upsert({
      where: { lectureId_studentId: { lectureId: lecture.id, studentId: studentRecords[0].id } },
      update: {},
      create: {
        lectureId: lecture.id,
        studentId: studentRecords[0].id,
        status: l === 5 ? 'ABSENT' : 'PRESENT',
      }
    });

    // Student 2 (Priya Sharma) - 80% attendance (present in 8/10, 1 leave)
    await prisma.attendance.upsert({
      where: { lectureId_studentId: { lectureId: lecture.id, studentId: studentRecords[1].id } },
      update: {},
      create: {
        lectureId: lecture.id,
        studentId: studentRecords[1].id,
        status: l === 3 ? 'ABSENT' : l === 7 ? 'LEAVE' : 'PRESENT',
      }
    });

    // Student 3 (Raj Patel) - 80% attendance (present in 8/10, 1 Medical)
    await prisma.attendance.upsert({
      where: { lectureId_studentId: { lectureId: lecture.id, studentId: studentRecords[2].id } },
      update: {},
      create: {
        lectureId: lecture.id,
        studentId: studentRecords[2].id,
        status: l === 4 ? 'ABSENT' : l === 8 ? 'MEDICAL_OD' : 'PRESENT',
      }
    });
  }

  // Seeding for Electrical Machines
  for (let l = 1; l <= 5; l++) {
    const lectureDate = new Date();
    lectureDate.setDate(today.getDate() - (5 - l));

    const lecture = await prisma.lecture.upsert({
      where: {
        subjectId_departmentId_semesterId_divisionId_date_lectureNumber: {
          subjectId: subEM.id,
          departmentId: deptElectrical.id,
          semesterId: sem6.id,
          divisionId: divA.id,
          date: new Date(lectureDate.toDateString()),
          lectureNumber: 2,
        }
      },
      update: {},
      create: {
        subjectId: subEM.id,
        departmentId: deptElectrical.id,
        semesterId: sem6.id,
        divisionId: divA.id,
        date: new Date(lectureDate.toDateString()),
        lectureNumber: 2,
        teacherId: teacher1.id,
      }
    });

    // Vasu Pathak
    await prisma.attendance.upsert({
      where: { lectureId_studentId: { lectureId: lecture.id, studentId: studentRecords[0].id } },
      update: {},
      create: {
        lectureId: lecture.id,
        studentId: studentRecords[0].id,
        status: 'PRESENT',
      }
    });

    // Priya Sharma
    await prisma.attendance.upsert({
      where: { lectureId_studentId: { lectureId: lecture.id, studentId: studentRecords[1].id } },
      update: {},
      create: {
        lectureId: lecture.id,
        studentId: studentRecords[1].id,
        status: l === 2 ? 'ABSENT' : 'PRESENT',
      }
    });

    // Raj Patel
    await prisma.attendance.upsert({
      where: { lectureId_studentId: { lectureId: lecture.id, studentId: studentRecords[2].id } },
      update: {},
      create: {
        lectureId: lecture.id,
        studentId: studentRecords[2].id,
        status: l === 3 ? 'ABSENT' : 'PRESENT',
      }
    });
  }

  console.log('Seeding database completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
