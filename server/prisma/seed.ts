import {
  PrismaClient,
  Role,
  TaskStatus,
  Priority,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Users
  const admin = await prisma.user.create({
    data: {
      name: "Aarav Admin",
      email: "admin@demo.local",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: "Priya Manager",
      email: "pm1@demo.local",
      passwordHash,
      role: Role.PM,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: "Ravi Manager",
      email: "pm2@demo.local",
      passwordHash,
      role: Role.PM,
    },
  });

  const developerNames = [
    "Neha Developer",
    "Arjun Developer",
    "Sara Developer",
    "Kabir Developer",
  ];

  const devs = await Promise.all(
    developerNames.map((name, i) =>
      prisma.user.create({
        data: {
          name,
          email: `dev${i + 1}@demo.local`,
          passwordHash,
          role: Role.DEVELOPER,
        },
      })
    )
  );

  // Clients
  const clients = await Promise.all(
    ["Acme Health", "Northstar Labs", "BrightPath Studio"].map((name) =>
      prisma.client.create({
        data: { name },
      })
    )
  );

  // Projects
  const projectNames = [
    "Acme Portal",
    "Northstar Analytics",
    "BrightPath Website",
  ];

  const projects = [];

  for (let i = 0; i < projectNames.length; i++) {
    const project = await prisma.project.create({
      data: {
        name: projectNames[i],
        description: "Internal client delivery project",
        clientId: clients[i].id,
        managerId: i === 2 ? pm2.id : pm1.id,
      },
    });

    projects.push(project);
  }

  // Tasks
  const statuses = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
    TaskStatus.IN_PROGRESS,
  ];

  const priorities = [
    Priority.HIGH,
    Priority.CRITICAL,
    Priority.MEDIUM,
    Priority.LOW,
    Priority.HIGH,
  ];

  for (let p = 0; p < projects.length; p++) {
    for (let i = 0; i < 5; i++) {
      const isOverdue = i === 0 && p < 2;

      const dueDate = new Date(
        Date.now() + (isOverdue ? -3 : i + 2) * 86400000
      );

      const developer = devs[(p + i) % devs.length];

      const task = await prisma.task.create({
        data: {
          title: `Task ${i + 1} — ${projects[p].name}`,
          description: "Seeded project task",
          projectId: projects[p].id,
          developerId: developer.id,
          status: statuses[i],
          priority: priorities[i],
          dueDate,
          isOverdue,
        },
      });

      // Create activity history
      if (i > 0 || p === 0) {
        await prisma.activity.create({
          data: {
            projectId: projects[p].id,
            taskId: task.id,
            userId: developer.id,
            oldStatus: i > 0 ? statuses[i - 1] : TaskStatus.TODO,
            newStatus: statuses[i],
            message:
              i > 0
                ? `${developer.name} moved ${task.title} from ${statuses[i - 1]} to ${statuses[i]}`
                : `${developer.name} created ${task.title}`,
          },
        });
      }
    }
  }

  // Initial notification
  const firstTask = await prisma.task.findFirst({
    where: {
      projectId: projects[0].id,
    },
  });

  if (firstTask) {
    await prisma.notification.create({
      data: {
        userId: devs[0].id,
        type: NotificationType.TASK_ASSIGNED,
        taskId: firstTask.id,
        message: `You were assigned ${firstTask.title}`,
      },
    });
  }

  console.log("=================================");
  console.log("Seed completed successfully!");
  console.log("=================================");
  console.log("Login password: Password123!");
  console.log("");
  console.log("Admin:       admin@demo.local");
  console.log("PM 1:        pm1@demo.local");
  console.log("PM 2:        pm2@demo.local");
  console.log("Developer 1: dev1@demo.local");
  console.log("Developer 2: dev2@demo.local");
  console.log("Developer 3: dev3@demo.local");
  console.log("Developer 4: dev4@demo.local");
  console.log("=================================");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });