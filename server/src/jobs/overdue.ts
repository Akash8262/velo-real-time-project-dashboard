import cron from "node-cron";
import { prisma } from "../utils/prisma";

export function startOverdueJob() {
  const run = async () => {
    try {
      await prisma.task.updateMany({
        where: { dueDate: { lt: new Date() }, status: { not: "DONE" }, isOverdue: false },
        data: { isOverdue: true },
      });
    } catch (error) {
      console.error("Overdue job failed:", error);
    }
  };
  void run();
  cron.schedule("*/5 * * * *", run);
}
