export type Role = "ADMIN" | "PM" | "DEVELOPER";

export type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
}

export interface Project {
  tasks: any;
  id: string;
  name: string;
  description?: string;
  client?: {
    id: string;
    name: string;
  };
  taskCount?: number;
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  developerId: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  isOverdue: boolean;
  developer?: User;
  project?: Project;
}

export interface Activity {
  fromStatus: string | null | undefined;
  toStatus: string | null | undefined;
  id: string;
  projectId: string;
  taskId?: string | null;
  userId: string;

  oldStatus?: Status | null;
  newStatus?: Status | null;

  message?: string;

  createdAt: string;

  user?: User;
  task?: Task;
  project?: Project;
}

export interface Notification {
  id: string;
  taskId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}