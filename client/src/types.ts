export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';
export type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface User { id:string; name:string; email:string; role:Role; }
export interface Client { id:string; name:string; email?:string|null; }
export interface Task { id:string; title:string; description:string; projectId:string; developerId:string; status:Status; priority:Priority; dueDate:string; isOverdue:boolean; developer?:User; project?:Project; }
export interface Project { id:string; name:string; description:string; clientId:string; managerId:string; client?:Client; manager?:User; tasks?:Task[]; taskCount?:number; _count?:{tasks:number}; }
export interface Activity { id:string; projectId:string; taskId:string; userId:string; oldStatus?:Status; newStatus?:Status; fromStatus?:Status; toStatus?:Status; message?:string; createdAt:string; user?:User; task?:Task; project?:Project; }
export interface Notification { id:string; userId:string; taskId:string; type:'TASK_ASSIGNED'|'TASK_IN_REVIEW'; message:string; read:boolean; createdAt:string; }
