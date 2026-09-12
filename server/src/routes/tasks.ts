import { Router } from 'express';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { auth } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { emitActivity, emitNotification } from '../sockets/socket';
const r=Router(); r.use(auth);

r.get('/', async(req:any,res,next)=>{try{
 const where:any={};
 if(req.user.role===Role.DEVELOPER) where.developerId=req.user.id;
 if(req.user.role===Role.PM) where.project={managerId:req.user.id};
 if(req.query.status) where.status=req.query.status;
 if(req.query.priority) where.priority=req.query.priority;
 if(req.query.from||req.query.to){where.dueDate={}; if(req.query.from)where.dueDate.gte=new Date(req.query.from); if(req.query.to)where.dueDate.lte=new Date(req.query.to);}
 const tasks=await prisma.task.findMany({where,include:{developer:true,project:true},orderBy:[{priority:'desc'},{dueDate:'asc'}]});
 res.json({tasks});
}catch(e){next(e)}});

r.patch('/:id',async(req:any,res,next)=>{try{
 const task=await prisma.task.findUnique({where:{id:req.params.id},include:{project:true}});
 if(!task)return res.status(404).json({error:{code:'NOT_FOUND',message:'Task not found'}});
 if(req.user.role===Role.DEVELOPER&&task.developerId!==req.user.id)return res.status(403).json({error:{code:'FORBIDDEN',message:'You can only update your assigned tasks'}});
 if(req.user.role===Role.PM&&task.project.managerId!==req.user.id)return res.status(403).json({error:{code:'FORBIDDEN',message:'You can only update tasks from your projects'}});
 const {status,priority,dueDate}=req.body;
 if(status&&!Object.values(TaskStatus).includes(status))return res.status(400).json({error:{code:'INVALID_STATUS',message:'Invalid task status'}});
 if(priority&&!Object.values(Priority).includes(priority))return res.status(400).json({error:{code:'INVALID_PRIORITY',message:'Invalid task priority'}});
 const statusChanged=Boolean(status)&&status!==task.status;
 const updated=await prisma.$transaction(async tx=>{
   const t=await tx.task.update({where:{id:task.id},data:{...(status?{status}:{}),...(priority?{priority}:{}),...(dueDate?{dueDate:new Date(dueDate),isOverdue:new Date(dueDate)<new Date()&& (status??task.status)!==TaskStatus.DONE}: {})},include:{developer:true,project:true}});
   if(statusChanged)await tx.activity.create({data:{projectId:task.projectId,taskId:task.id,userId:req.user.id,oldStatus:task.status,newStatus:status,message:`${req.user.name} moved ${task.title} from ${task.status} to ${status}`}});
   return t;
 });
 if(statusChanged){
   const activity=await prisma.activity.findFirst({where:{taskId:task.id,userId:req.user.id,newStatus:status},orderBy:{createdAt:'desc'},include:{user:true,task:true,project:true}});
   if(activity)emitActivity(activity);
 }
 if(status===TaskStatus.IN_REVIEW&&status!==task.status){
   try{const notification=await prisma.notification.create({data:{taskId:task.id,type:'TASK_IN_REVIEW',message:`${task.title} was moved to In Review.`,userId:task.project.managerId}});emitNotification(task.project.managerId,notification);}catch(e){console.error('Review notification failed:',e)}
 }
 res.json({task:updated});
}catch(e){next(e)}});
export default r;
