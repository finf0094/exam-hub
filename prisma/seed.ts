import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      name: "Demo Teacher",
      email: "teacher@example.com",
      passwordHash,
      role: "TEACHER",
    },
  });

  await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      name: "Demo Student",
      email: "student@example.com",
      passwordHash,
      role: "STUDENT",
    },
  });

  const existingExam = await prisma.exam.findFirst({
    where: { teacherId: teacher.id, title: "Intro to Web Development" },
  });

  if (!existingExam) {
    const now = new Date();
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.exam.create({
      data: {
        title: "Intro to Web Development",
        description: "A short quiz covering HTML, CSS and JavaScript basics.",
        durationMinutes: 15,
        startAt,
        endAt,
        isPublished: true,
        teacherId: teacher.id,
        questions: {
          create: [
            {
              text: "Which HTML tag is used to create a hyperlink?",
              type: "SINGLE",
              points: 1,
              order: 1,
              options: {
                create: [
                  { text: "<link>", isCorrect: false },
                  { text: "<a>", isCorrect: true },
                  { text: "<href>", isCorrect: false },
                  { text: "<nav>", isCorrect: false },
                ],
              },
            },
            {
              text: "Which of the following are valid CSS units?",
              type: "MULTIPLE",
              points: 2,
              order: 2,
              options: {
                create: [
                  { text: "px", isCorrect: true },
                  { text: "rem", isCorrect: true },
                  { text: "vw", isCorrect: true },
                  { text: "dpi", isCorrect: false },
                ],
              },
            },
            {
              text: "Which keyword declares a block-scoped variable in JavaScript?",
              type: "SINGLE",
              points: 1,
              order: 3,
              options: {
                create: [
                  { text: "var", isCorrect: false },
                  { text: "let", isCorrect: true },
                  { text: "define", isCorrect: false },
                  { text: "const int", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Admin:   admin@example.com / password123`);
  console.log(`  Teacher: teacher@example.com / password123`);
  console.log(`  Student: student@example.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
