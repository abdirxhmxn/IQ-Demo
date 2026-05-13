# IlmQuest — Demo Credentials

These accounts are seeded by `npm run seed:demo` and exist only in the demo database.
No real student or family data is referenced.

**Live demo:** https://iq-demo.onrender.com

|    Role   |            Email            |    Password    |                What to look at                |
|  -------  | --------------------------- | -------------- | --------------------------------------------- |
|   Admin   | `admin@demo.ilmquest.com`   | `DemoPass123!` | Full access — manage users, classes, missions. |
|  Teacher  | `teacher@demo.ilmquest.com` | `DemoPass123!` | Owns Quran – Grade 5. Has graded the demo student. |
|  Parent   | `parent@demo.ilmquest.com`  | `DemoPass123!` | Linked to Zayd Diallo (the demo student) + Layla Diallo. |
|  Student  | `student@demo.ilmquest.com` | `DemoPass123!` | Zayd Diallo, Grade 5 Tahfiidth. Has grades, attendance, and an active mission. |

## Tenant

- **Academy:** Demo Academy (Main Center)
- **Classes:** Quran Recitation – Grade 3, Quran Recitation – Grade 5, Arabic Language – Grades 3 & 4, Islamic Studies – Grades 4 & 5
- **Students:** 18 enrolled across Grades 3 – 5
- **Attendance:** past 14 weekdays per class
- **Grades:** 6 assignment types per class (Homework / Quiz / Test / Behavior / Participation)
- **Missions:** 8 active across all classes; the demo student has one in-progress

## Reseed

```bash
npm run seed:demo
```

Running again is safe — the script wipes only records tagged with the demo email domain (`@demo.ilmquest.com`) and the `DEMO-` class-code prefix, then reinserts.
