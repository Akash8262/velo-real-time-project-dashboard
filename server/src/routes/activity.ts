import { Router } from 'express';
import { Role } from '@prisma/client';
import { auth } from '../middleware/auth';
import { prisma } from '../utils/prisma';
const r=Router();r.use(auth);

r.get('/recent',async(req:any,res,next)=>{try{
 const where:any={};
 if(req.user.role===Role.PM)where.project={managerId:req.user.id};
 if(req.user.role===Role.DEVELOPER)where.task={developerId:req.user.id};
 const activities=await prisma.activity.findMany({where,orderBy:{createdAt:'desc'},take:20,include:{user:true,task:true,project:true}});
 res.json({activities});
}catch(e){next(e)}});

r.get('/project/:id',async(req:any,res,next)=>{try{
 const project=await prisma.project.findUnique({where:{id:req.params.id}});
 if(!project)return res.status(404).json({error:{code:'NOT_FOUND',message:'Project not found'}});
 if(req.user.role===Role.PM&&project.managerId!==req.user.id)return res.status(403).json({error:{code:'FORBIDDEN',message:'Access denied'}});
 if(req.user.role===Role.DEVELOPER){const assigned=await prisma.task.count({where:{projectId:project.id,developerId:req.user.id}});if(!assigned)return res.status(403).json({error:{code:'FORBIDDEN',message:'Access denied'}});}
 const activities=await prisma.activity.findMany({where:{projectId:project.id,...(req.user.role===Role.DEVELOPER?{task:{developerId:req.user.id}}:{})},orderBy:{createdAt:'desc'},take:20,include:{user:true,task:true,project:true}});
 res.json({activities});
}catch(e){next(e)}});
export default r;
