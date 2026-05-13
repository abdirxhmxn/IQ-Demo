/**
 * seedDemo.js — IlmQuest demo data seeder
 *
 * Builds a fully populated "Demo Academy" so recruiters can log in as any role
 * and see every feature without a guided tour. Idempotent: wipes demo records
 * (tagged via stable email/classCode/employeeId patterns) and reseeds.
 *
 * Usage:
 *   npm run seed:demo
 *   node seedDemo.js --force   # required if NODE_ENV=production
 *
 * Reads models from backend/models. Hashes passwords through the User model's
 * pre-save bcrypt hook (rounds: 10) — same path the real signup flow uses.
 */

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "backend/config/.env") });

const User = require("./backend/models/User");
const Class = require("./backend/models/Class");
const Grade = require("./backend/models/Grades");
const Attendance = require("./backend/models/Attendance");
const Mission = require("./backend/models/Missions");
const Reflection = require("./backend/models/Reflections");
const Verses = require("./backend/models/Verses");

// ---------------------------------------------------------------------------
// Safety: refuse to run in production without --force
// ---------------------------------------------------------------------------
const FORCE = process.argv.includes("--force");
if (process.env.NODE_ENV === "production" && !FORCE) {
  console.error(
    "Refusing to seed: NODE_ENV=production. Re-run with --force if you really mean it."
  );
  process.exit(1);
}
if (!process.env.DB_STRING) {
  console.error("FATAL: DB_STRING is not set. Check config/.env.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Demo identity constants — used both to insert AND to wipe on reseed
// ---------------------------------------------------------------------------
const DEMO_EMAIL_DOMAIN = "demo.ilmquest.com";
const DEMO_PASSWORD = "DemoPass123!";
const DEMO_CLASS_PREFIX = "DEMO-";
const DEMO_EMPLOYEE_PREFIX = "DEMO-EMP-";
const DEMO_STUDENT_NUM_BASE = 90000;

const DEMO_EMAIL_REGEX = new RegExp(`@${DEMO_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`, "i");

// ---------------------------------------------------------------------------
// Cast lists. Names are fully fictional, mix of Arabic + English.
// ---------------------------------------------------------------------------
const ADMINS = [
  {
    userName: "demo.admin",
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Khadija",
    lastName: "Hassan",
    gender: "female",
    DOB: new Date("1985-04-12"),
  },
];

const TEACHERS = [
  {
    userName: "demo.teacher",
    email: `teacher@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Yusuf",
    lastName: "Rahman",
    gender: "male",
    DOB: new Date("1986-09-03"),
    teacherInfo: {
      employeeId: `${DEMO_EMPLOYEE_PREFIX}001`,
      hireDate: new Date("2021-08-15"),
      subjects: ["Quran", "Tajweed"],
    },
  },
  {
    userName: "demo.teacher.maryam",
    email: `maryam.teacher@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Maryam",
    lastName: "Patel",
    gender: "female",
    DOB: new Date("1989-02-18"),
    teacherInfo: {
      employeeId: `${DEMO_EMPLOYEE_PREFIX}002`,
      hireDate: new Date("2022-01-10"),
      subjects: ["Arabic", "Islamic Studies"],
    },
  },
  {
    userName: "demo.teacher.ibrahim",
    email: `ibrahim.teacher@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Ibrahim",
    lastName: "Carter",
    gender: "male",
    DOB: new Date("1983-11-27"),
    teacherInfo: {
      employeeId: `${DEMO_EMPLOYEE_PREFIX}003`,
      hireDate: new Date("2020-09-01"),
      subjects: ["Fiqh", "Seerah"],
    },
  },
];

const PARENTS = [
  {
    userName: "demo.parent",
    email: `parent@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Aisha",
    lastName: "Diallo",
    gender: "female",
    DOB: new Date("1982-07-22"),
  },
  {
    userName: "demo.parent.omar",
    email: `omar.parent@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Omar",
    lastName: "Lee",
    gender: "male",
    DOB: new Date("1980-03-14"),
  },
  {
    userName: "demo.parent.fatima",
    email: `fatima.parent@${DEMO_EMAIL_DOMAIN}`,
    firstName: "Fatima",
    lastName: "Okafor",
    gender: "female",
    DOB: new Date("1984-12-05"),
  },
];

// 18 students. First one is the recruiter-facing student account.
const STUDENTS = [
  { firstName: "Zayd",     lastName: "Diallo",  gender: "male",   gradeLevel: "Grade 5", programType: "Tahfiidth", userName: "demo.student",         email: `student@${DEMO_EMAIL_DOMAIN}` },
  { firstName: "Layla",    lastName: "Diallo",  gender: "female", gradeLevel: "Grade 3", programType: "Khatm" },
  { firstName: "Bilal",    lastName: "Lee",     gender: "male",   gradeLevel: "Grade 5", programType: "Khatm" },
  { firstName: "Sumayya",  lastName: "Lee",     gender: "female", gradeLevel: "Grade 4", programType: "Tahfiidth" },
  { firstName: "Hamza",    lastName: "Okafor",  gender: "male",   gradeLevel: "Grade 3", programType: "Khatm" },
  { firstName: "Nusaybah", lastName: "Okafor",  gender: "female", gradeLevel: "Grade 4", programType: "Khatm" },
  { firstName: "Idris",    lastName: "Khan",    gender: "male",   gradeLevel: "Grade 5", programType: "Tahfiidth" },
  { firstName: "Safiyya",  lastName: "Brooks",  gender: "female", gradeLevel: "Grade 3", programType: "Khatm" },
  { firstName: "Musa",     lastName: "Ahmed",   gender: "male",   gradeLevel: "Grade 4", programType: "Khatm" },
  { firstName: "Hafsa",    lastName: "Morgan",  gender: "female", gradeLevel: "Grade 5", programType: "Khatm" },
  { firstName: "Adam",     lastName: "Reed",    gender: "male",   gradeLevel: "Grade 3", programType: "Khatm" },
  { firstName: "Khalid",   lastName: "Thompson",gender: "male",   gradeLevel: "Grade 4", programType: "Tahfiidth" },
  { firstName: "Asiya",    lastName: "Owens",   gender: "female", gradeLevel: "Grade 5", programType: "Khatm" },
  { firstName: "Hudayfah", lastName: "Carter",  gender: "male",   gradeLevel: "Grade 3", programType: "Khatm" },
  { firstName: "Ruqayyah", lastName: "Patel",   gender: "female", gradeLevel: "Grade 4", programType: "Khatm" },
  { firstName: "Salman",   lastName: "Diaz",    gender: "male",   gradeLevel: "Grade 5", programType: "Khatm" },
  { firstName: "Maymunah", lastName: "Khan",    gender: "female", gradeLevel: "Grade 3", programType: "Tahfiidth" },
  { firstName: "Tariq",    lastName: "Hassan",  gender: "male",   gradeLevel: "Grade 4", programType: "Khatm" },
].map((s, i) => ({
  userName: s.userName || `demo.student.${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}`,
  email: s.email || `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}.${i}@${DEMO_EMAIL_DOMAIN}`,
  firstName: s.firstName,
  lastName: s.lastName,
  gender: s.gender,
  DOB: new Date(2014 - parseInt(s.gradeLevel.split(" ")[1], 10), (i * 37) % 12, ((i * 11) % 27) + 1),
  studentInfo: {
    enrollmentDate: new Date("2025-09-01"),
    gradeLevel: s.gradeLevel,
    programType: s.programType,
    studentNumber: DEMO_STUDENT_NUM_BASE + i,
  },
  points: 50 + ((i * 73) % 450),
  rank: ["F", "E", "D", "C", "B", "A", "S"][Math.min(6, Math.floor(((50 + (i * 73) % 450)) / 80))],
}));

// 4 classes. classCode prefix DEMO- so we can wipe on reseed.
const CLASS_DEFS = [
  {
    classCode: `${DEMO_CLASS_PREFIX}QR-G3`,
    className: "Quran Recitation – Grade 3",
    teacherIdx: 0, // Yusuf (demo.teacher)
    subjects: [{ name: "Quran", gradeLevel: "Grade 3" }, { name: "Tajweed", gradeLevel: "Grade 3" }],
    schedule: [{ day: "Mon", startTime: "09:00", endTime: "10:30" }, { day: "Wed", startTime: "09:00", endTime: "10:30" }],
    studentGrades: ["Grade 3"],
    roomNumber: "101",
  },
  {
    classCode: `${DEMO_CLASS_PREFIX}QR-G5`,
    className: "Quran Recitation – Grade 5",
    teacherIdx: 0, // Yusuf (demo.teacher) — owns the demo student's class
    subjects: [{ name: "Quran", gradeLevel: "Grade 5" }, { name: "Tajweed", gradeLevel: "Grade 5" }],
    schedule: [{ day: "Tue", startTime: "09:00", endTime: "10:30" }, { day: "Thu", startTime: "09:00", endTime: "10:30" }],
    studentGrades: ["Grade 5"],
    roomNumber: "102",
  },
  {
    classCode: `${DEMO_CLASS_PREFIX}AR-G34`,
    className: "Arabic Language – Grades 3 & 4",
    teacherIdx: 1, // Maryam
    subjects: [{ name: "Arabic", gradeLevel: "Grade 3" }, { name: "Arabic", gradeLevel: "Grade 4" }],
    schedule: [{ day: "Mon", startTime: "11:00", endTime: "12:00" }, { day: "Wed", startTime: "11:00", endTime: "12:00" }],
    studentGrades: ["Grade 3", "Grade 4"],
    roomNumber: "203",
  },
  {
    classCode: `${DEMO_CLASS_PREFIX}IS-G45`,
    className: "Islamic Studies – Grades 4 & 5",
    teacherIdx: 2, // Ibrahim
    subjects: [{ name: "Islamic Studies", gradeLevel: "Grade 4" }, { name: "Seerah", gradeLevel: "Grade 5" }],
    schedule: [{ day: "Tue", startTime: "13:00", endTime: "14:30" }, { day: "Fri", startTime: "10:00", endTime: "11:30" }],
    studentGrades: ["Grade 4", "Grade 5"],
    roomNumber: "204",
  },
];

const SUBJECT_PER_CLASS = {
  [`${DEMO_CLASS_PREFIX}QR-G3`]: "Quran",
  [`${DEMO_CLASS_PREFIX}QR-G5`]: "Quran",
  [`${DEMO_CLASS_PREFIX}AR-G34`]: "Arabic",
  [`${DEMO_CLASS_PREFIX}IS-G45`]: "Islamic Studies",
};

// Parent → student linkage (by lastName match keeps the demo coherent)
const PARENT_LINKS = [
  { parentEmail: `parent@${DEMO_EMAIL_DOMAIN}`,        childLastNames: ["Diallo"], relationship: "Mother" },
  { parentEmail: `omar.parent@${DEMO_EMAIL_DOMAIN}`,   childLastNames: ["Lee"],    relationship: "Father" },
  { parentEmail: `fatima.parent@${DEMO_EMAIL_DOMAIN}`, childLastNames: ["Okafor"], relationship: "Mother" },
];

// Reflections + Verses — small starter set so the student home renders even
// before the larger seed.js runs.
const DEMO_REFLECTIONS = [
  {
    type: "Quran",
    arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
    translation: "For indeed, with hardship comes ease.",
    reference: "94:5",
    tags: ["patience", "hope"],
  },
  {
    type: "Hadith",
    arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
    translation: "Actions are judged by intentions.",
    reference: "Bukhari 1",
    narrator: "Bukhari",
    hadithNumber: "1",
    tags: ["intention", "ikhlas"],
  },
];

const DEMO_VERSES = [
  {
    type: "Quran",
    arabic: "وَقُلْ رَبِّ زِدْنِي عِلْمًا",
    translation: "And say, 'My Lord, increase me in knowledge.'",
    reference: "20:114",
    surah: "Ta-Ha",
    tags: ["knowledge", "dua"],
  },
  {
    type: "Quran",
    arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    translation: "Indeed, Allah is with the patient.",
    reference: "2:153",
    surah: "Al-Baqarah",
    tags: ["patience"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const log = (...a) => console.log("[seed:demo]", ...a);

function pastWeekdays(daysBack) {
  const out = [];
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) out.push(d); // skip Sat/Sun
  }
  return out.reverse();
}

function pickAttendanceStatus(seed) {
  // ~80% Present, ~10% Late, ~7% Absent, ~3% Excused
  const r = (seed * 9301 + 49297) % 100;
  if (r < 80) return "Present";
  if (r < 90) return "Late";
  if (r < 97) return "Absent";
  return "Excused";
}

function fullName(u) {
  return `${u.firstName} ${u.lastName}`;
}

// ---------------------------------------------------------------------------
// Wipe step — narrow, demo-scoped only. Real-school records survive.
// ---------------------------------------------------------------------------
async function wipeDemo() {
  log("Wiping prior demo records…");

  const demoUsers = await User.find({ email: DEMO_EMAIL_REGEX }, { _id: 1 }).lean();
  const demoUserIds = demoUsers.map(u => u._id);

  const demoClasses = await Class.find(
    { classCode: { $regex: `^${DEMO_CLASS_PREFIX}` } },
    { _id: 1 }
  ).lean();
  const demoClassIds = demoClasses.map(c => c._id);

  await Promise.all([
    Attendance.deleteMany({ classId: { $in: demoClassIds } }),
    Grade.deleteMany({ "classInfo._id": { $in: demoClassIds } }),
    Mission.deleteMany({ "createdBy._id": { $in: demoUserIds } }),
    Class.deleteMany({ _id: { $in: demoClassIds } }),
    User.deleteMany({ _id: { $in: demoUserIds } }),
    Reflection.deleteMany({ reference: { $in: DEMO_REFLECTIONS.map(r => r.reference) } }),
    Verses.deleteMany({ reference: { $in: DEMO_VERSES.map(v => v.reference) } }),
  ]);

  log(`  removed ${demoUserIds.length} users, ${demoClassIds.length} classes, and their related records`);
}

// ---------------------------------------------------------------------------
// Insert helpers — use .save() so the User pre-save bcrypt hook runs.
// insertMany would skip the hook and store plaintext.
// ---------------------------------------------------------------------------
async function createUser(data) {
  const u = new User({ ...data, password: DEMO_PASSWORD });
  await u.save();
  return u;
}

async function createUsers(list) {
  const out = [];
  for (const data of list) out.push(await createUser(data));
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  log(`Connecting to MongoDB…`);
  await mongoose.connect(process.env.DB_STRING);
  log("Connected.");

  await wipeDemo();

  // 1. Users
  log("Creating users…");
  const admins   = await createUsers(ADMINS.map(a => ({ ...a, role: "admin" })));
  const teachers = await createUsers(TEACHERS.map(t => ({ ...t, role: "teacher" })));
  const parents  = await createUsers(PARENTS.map(p => ({ ...p, role: "parent" })));
  const students = await createUsers(STUDENTS.map(s => ({ ...s, role: "student" })));
  log(`  ${admins.length} admin, ${teachers.length} teachers, ${parents.length} parents, ${students.length} students`);

  // 2. Classes — assign students by grade level, attach teacher
  log("Creating classes…");
  const classes = [];
  for (const def of CLASS_DEFS) {
    const teacher = teachers[def.teacherIdx];
    const enrolled = students.filter(s => def.studentGrades.includes(s.studentInfo.gradeLevel));

    const cls = await Class.create({
      className: def.className,
      classCode: def.classCode,
      teachers: [{ _id: teacher._id, name: fullName(teacher) }],
      subjects: def.subjects,
      students: enrolled.map(s => ({ _id: s._id, name: fullName(s) })),
      schedule: def.schedule,
      academicYear: { year: "2025-2026", semester: "Semester 1", quarter: "Q1" },
      active: true,
      location: "Demo Academy – Main Center",
      roomNumber: def.roomNumber,
      capacity: 25,
    });

    // Back-fill teacher.teacherInfo.classes and student.studentInfo.classId
    await User.updateOne(
      { _id: teacher._id },
      { $addToSet: { "teacherInfo.classes": cls._id } }
    );
    if (def.classCode === `${DEMO_CLASS_PREFIX}QR-G5`) {
      // Make the demo student's home class the Quran G5 class
      await User.updateMany(
        { _id: { $in: enrolled.map(s => s._id) } },
        { $set: { "studentInfo.classId": cls._id } }
      );
    }

    classes.push(cls);
  }
  log(`  ${classes.length} classes created`);

  // 3. Parent ↔ Student links (schema-less fields — use strict:false updates)
  log("Linking parents to students…");
  for (const link of PARENT_LINKS) {
    const parent = parents.find(p => p.email === link.parentEmail);
    if (!parent) continue;
    const kids = students.filter(s => link.childLastNames.includes(s.lastName));
    if (!kids.length) continue;

    await User.updateOne(
      { _id: parent._id },
      {
        $set: {
          "parentInfo.children": kids.map(k => ({
            childID: k._id,
            childName: fullName(k),
          })),
        },
      },
      { strict: false }
    );

    for (const kid of kids) {
      await User.updateOne(
        { _id: kid._id },
        {
          $addToSet: {
            "studentInfo.parents": {
              parentID: parent._id,
              parentName: fullName(parent),
              relationship: link.relationship,
            },
          },
        },
        { strict: false }
      );
    }
  }

  // 4. Attendance — past 2 weeks of weekdays, per class
  log("Creating attendance (past 2 weeks)…");
  const attendanceDates = pastWeekdays(14);
  const attendanceDocs = [];
  for (const cls of classes) {
    const teacher = teachers.find(t => cls.teachers[0]._id.equals(t._id));
    for (let d = 0; d < attendanceDates.length; d++) {
      const date = attendanceDates[d];
      attendanceDocs.push({
        classId: cls._id,
        className: cls.className,
        date,
        records: cls.students.map((s, sIdx) => ({
          studentId: s._id,
          studentName: s.name,
          status: pickAttendanceStatus(d * 31 + sIdx * 7 + cls.classCode.length),
        })),
        recordedBy: { _id: teacher._id, name: fullName(teacher) },
      });
    }
  }
  await Attendance.insertMany(attendanceDocs);
  log(`  ${attendanceDocs.length} attendance sessions recorded`);

  // 5. Grades — a spread of Homework/Quiz/Test/Behavior across each class
  log("Creating grades…");
  const ASSIGNMENT_TEMPLATES = [
    { type: "Homework",      name: "Daily Review",          maxScore: 100, dayOffset: 2 },
    { type: "Quiz",          name: "Weekly Quiz",           maxScore: 25,  dayOffset: 5 },
    { type: "Homework",      name: "Practice Set",          maxScore: 100, dayOffset: 8 },
    { type: "Test",          name: "Unit Test",             maxScore: 100, dayOffset: 11 },
    { type: "Behavior",      name: "Adab Reflection",       maxScore: 10,  dayOffset: 6 },
    { type: "Participation", name: "Class Engagement",      maxScore: 10,  dayOffset: 9 },
  ];

  const gradeDocs = [];
  for (const cls of classes) {
    const teacher = teachers.find(t => cls.teachers[0]._id.equals(t._id));
    const subject = SUBJECT_PER_CLASS[cls.classCode];

    for (const tmpl of ASSIGNMENT_TEMPLATES) {
      for (let sIdx = 0; sIdx < cls.students.length; sIdx++) {
        const stu = cls.students[sIdx];
        // Pseudo-realistic score: most students 75-95%, occasional miss
        const seed = (sIdx * 17 + tmpl.name.length * 3 + cls.classCode.length) % 100;
        const ratio = seed < 10 ? 0.55 + (seed / 100) : 0.75 + (seed % 20) / 100;
        const score = Math.round(tmpl.maxScore * ratio);

        const assignedDate = new Date();
        assignedDate.setDate(assignedDate.getDate() - tmpl.dayOffset);

        gradeDocs.push({
          students: [{ _id: stu._id, name: stu.name }],
          classInfo: [{ _id: cls._id, name: cls.className }],
          quarter: "Q1",
          subject,
          Assignment: {
            name: `${tmpl.name} — ${subject}`,
            description: `${tmpl.type} for ${cls.className}`,
            grade: score,
            maxScore: tmpl.maxScore,
            type: tmpl.type,
          },
          assignedDate,
          dueDate: new Date(assignedDate.getTime() + 1000 * 60 * 60 * 24 * 3),
          feedback: {
            content:
              score / tmpl.maxScore > 0.85
                ? "Excellent work — keep it up."
                : score / tmpl.maxScore > 0.7
                ? "Solid effort. Review your weak spots."
                : "Let's go over this together next session.",
            teacher: { _id: teacher._id, name: fullName(teacher) },
          },
          active: true,
        });
      }
    }
  }
  await Grade.insertMany(gradeDocs);
  log(`  ${gradeDocs.length} grade entries`);

  // 6. Missions — assigned to classes
  log("Creating missions…");
  const MISSION_TEMPLATES = [
    { title: "Memorize Surah Al-Fatihah", type: "Ilm",            category: "Solo", rank: "E", pointsXP: 50,  timeLimit: "Weekly", classCode: `${DEMO_CLASS_PREFIX}QR-G3` },
    { title: "Memorize Surah Al-Mulk",    type: "Ilm",            category: "Solo", rank: "B", pointsXP: 200, timeLimit: "Weekly", classCode: `${DEMO_CLASS_PREFIX}QR-G5` },
    { title: "30 Days of Salah on Time",  type: "Taqwa",          category: "Solo", rank: "A", pointsXP: 300, timeLimit: "Daily",  classCode: `${DEMO_CLASS_PREFIX}QR-G5` },
    { title: "Help a Classmate Recite",   type: "Adab & Akhlaq",  category: "Team", rank: "D", pointsXP: 75,  timeLimit: "None",   classCode: `${DEMO_CLASS_PREFIX}QR-G5` },
    { title: "Read 5 Hadith This Week",   type: "Ilm",            category: "Solo", rank: "C", pointsXP: 100, timeLimit: "Weekly", classCode: `${DEMO_CLASS_PREFIX}IS-G45` },
    { title: "Write a Seerah Reflection", type: "Ihsaan",         category: "Solo", rank: "C", pointsXP: 120, timeLimit: "Weekly", classCode: `${DEMO_CLASS_PREFIX}IS-G45` },
    { title: "Arabic Vocabulary – 20",    type: "Ilm",            category: "Solo", rank: "E", pointsXP: 40,  timeLimit: "Weekly", classCode: `${DEMO_CLASS_PREFIX}AR-G34` },
    { title: "Truthfulness Week",         type: "Amanah",         category: "Solo", rank: "B", pointsXP: 150, timeLimit: "Weekly", classCode: `${DEMO_CLASS_PREFIX}IS-G45` },
  ];

  const missionDocs = [];
  for (const tmpl of MISSION_TEMPLATES) {
    const cls = classes.find(c => c.classCode === tmpl.classCode);
    if (!cls) continue;
    const teacher = teachers.find(t => cls.teachers[0]._id.equals(t._id));
    const due = new Date();
    due.setDate(due.getDate() + 7);

    missionDocs.push({
      title: tmpl.title,
      description: `Demo mission for ${cls.className}.`,
      type: tmpl.type,
      category: tmpl.category,
      rank: tmpl.rank,
      pointsXP: tmpl.pointsXP,
      timeLimit: tmpl.timeLimit,
      dueDate: due,
      assignedTo: {
        classInfo: [cls._id],
        studentInfo: cls.students.map(s => s._id),
      },
      createdBy: {
        _id: teacher._id,
        name: fullName(teacher),
        employeeId: teacher.teacherInfo?.employeeId,
      },
      active: {
        status: true,
        // Mark one mission as in-progress for the demo student so the
        // student/missions page shows an active mission card.
        studentInfo:
          tmpl.classCode === `${DEMO_CLASS_PREFIX}QR-G5`
            ? cls.students
                .filter(s => s.name === "Zayd Diallo")
                .map(s => ({
                  _id: s._id,
                  name: s.name,
                  attempt: 1,
                  status: "started",
                  startedAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
                }))
            : [],
      },
    });
  }
  await Mission.insertMany(missionDocs);
  log(`  ${missionDocs.length} missions`);

  // 7. Reflections + Verses — small starter set (existing seed.js can add more)
  log("Seeding reflections + verses…");
  for (const r of DEMO_REFLECTIONS) {
    await Reflection.updateOne({ reference: r.reference, type: r.type }, { $setOnInsert: r }, { upsert: true });
  }
  for (const v of DEMO_VERSES) {
    await Verses.updateOne({ reference: v.reference }, { $setOnInsert: v }, { upsert: true });
  }

  // 8. Write DEMO_CREDENTIALS.md
  log("Writing DEMO_CREDENTIALS.md…");
  const accounts = [
    { role: "Admin",   account: admins[0],   note: "Full access — manage users, classes, missions." },
    { role: "Teacher", account: teachers[0], note: "Owns Quran – Grade 5. Has graded the demo student." },
    { role: "Parent",  account: parents[0],  note: "Linked to Zayd Diallo (the demo student) + Layla Diallo." },
    { role: "Student", account: students[0], note: "Zayd Diallo, Grade 5 Tahfiidth. Has grades, attendance, and an active mission." },
  ];
  const md = renderCredentials(accounts);
  fs.writeFileSync(path.join(__dirname, "DEMO_CREDENTIALS.md"), md);

  log("Done. Demo data seeded successfully.");
  console.table(accounts.map(a => ({ Role: a.role, Email: a.account.email, Password: DEMO_PASSWORD })));
  await mongoose.connection.close();
}

function renderCredentials(accounts) {
  const lines = [];
  lines.push("# IlmQuest — Demo Credentials");
  lines.push("");
  lines.push("These accounts are seeded by `npm run seed:demo` and exist only in the demo database.");
  lines.push("No real student or family data is referenced.");
  lines.push("");
  lines.push("**Live demo:** https://iq-demo.onrender.com");
  lines.push("");
  lines.push("| Role | Email | Password | What to look at |");
  lines.push("| --- | --- | --- | --- |");
  for (const a of accounts) {
    lines.push(`| ${a.role} | \`${a.account.email}\` | \`${DEMO_PASSWORD}\` | ${a.note} |`);
  }
  lines.push("");
  lines.push("## Tenant");
  lines.push("");
  lines.push("- **Academy:** Demo Academy (Main Center)");
  lines.push("- **Classes:** Quran Recitation – Grade 3, Quran Recitation – Grade 5, Arabic Language – Grades 3 & 4, Islamic Studies – Grades 4 & 5");
  lines.push("- **Students:** 18 enrolled across Grades 3 – 5");
  lines.push("- **Attendance:** past 14 weekdays per class");
  lines.push("- **Grades:** 6 assignment types per class (Homework / Quiz / Test / Behavior / Participation)");
  lines.push("- **Missions:** 8 active across all classes; the demo student has one in-progress");
  lines.push("");
  lines.push("## Reseed");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run seed:demo");
  lines.push("```");
  lines.push("");
  lines.push("Running again is safe — the script wipes only records tagged with the demo email domain (`@demo.ilmquest.com`) and the `DEMO-` class-code prefix, then reinserts.");
  lines.push("");
  return lines.join("\n");
}

seed().catch(async (err) => {
  console.error("[seed:demo] FAILED:", err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
