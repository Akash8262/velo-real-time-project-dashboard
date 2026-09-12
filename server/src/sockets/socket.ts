import { Server, Socket } from 'socket.io';
import { verifyAccess } from '../utils/auth';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';

let io: Server | undefined;
const onlineSockets = new Map<string, number>();

export function setupSocket(http: any) {
  io = new Server(http, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      socket.data.user = verifyAccess(token);
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    onlineSockets.set(user.id, (onlineSockets.get(user.id) ?? 0) + 1);
    socket.join(`user:${user.id}`);
    if (user.role === Role.ADMIN) socket.join('global:activity');
    io?.emit('presence:count', onlineSockets.size);

    socket.on('project:join', async (projectId: string) => {
      try {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return;
        let allowed = user.role === Role.ADMIN;
        if (user.role === Role.PM) allowed = project.managerId === user.id;
        if (user.role === Role.DEVELOPER) {
          allowed = (await prisma.task.count({ where: { projectId, developerId: user.id } })) > 0;
        }
        if (allowed) socket.join(`project:${projectId}`);
      } catch (error) { console.error('project:join failed:', error); }
    });

    socket.on('project:leave', (projectId: string) => socket.leave(`project:${projectId}`));
    socket.on('disconnect', (reason) => {
      const count = onlineSockets.get(user.id) ?? 1;
      if (count <= 1) onlineSockets.delete(user.id); else onlineSockets.set(user.id, count - 1);
      console.log(`Socket disconnected: ${user.name} (${reason})`);
      io?.emit('presence:count', onlineSockets.size);
    });
  });
  return io;
}

export function socket() { return io; }
export function emitActivity(activity: any) {
  if (!io) return;
  io.to(`project:${activity.projectId}`).emit('activity:new', activity);
  io.to('global:activity').emit('activity:new', activity);
  if (activity.project?.managerId) io.to(`user:${activity.project.managerId}`).emit('activity:new', activity);
  if (activity.task?.developerId) io.to(`user:${activity.task.developerId}`).emit('activity:new', activity);
}
export function emitNotification(userId: string, notification: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(`notification:${userId}`, notification);
}
