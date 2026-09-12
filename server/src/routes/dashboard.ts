import { Router } from "express";
import { auth } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { Role } from "@prisma/client";

const r = Router();

r.use(auth);

r.get("/", async (req: any, res, next) => {
  try {
    if (req.user.role === Role.ADMIN) {
      const [projects, tasks, overdue] = await Promise.all([
        prisma.project.count(),

        prisma.task.groupBy({
          by: ["status"],
          _count: true,
        }),

        prisma.task.count({
          where: {
            isOverdue: true,
          },
        }),
      ]);

      return res.json({
        role: "ADMIN",
        projects,
        tasksByStatus: tasks,
        overdue,
      });
    }

    if (req.user.role === Role.PM) {
      const projects = await prisma.project.findMany({
        where: {
          managerId: req.user.id,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      return res.json({
        role: "PM",
        projects,
      });
    }

    const tasks = await prisma.task.findMany({
      where: {
        developerId: req.user.id,
      },
      include: {
        project: true,
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          dueDate: "asc",
        },
      ],
    });

    return res.json({
      role: "DEVELOPER",
      tasks,
    });
  } catch (e) {
    next(e);
  }
});

export default r;