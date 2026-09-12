import {Router} from 'express';import {z} from 'zod';import {Role} from '@prisma/client';import {prisma} from '../utils/prisma';import {auth,roles} from '../middleware/auth';
const r=Router();r.use(auth);
r.get('/',async(_req,res,next)=>{try{res.json({clients:await prisma.client.findMany({include:{_count:{select:{projects:true}}},orderBy:{name:'asc'}})})}catch(e){next(e)}});
r.post('/',roles(Role.ADMIN,Role.PM),async(req,res,next)=>{try{const b=z.object({name:z.string().min(2),email:z.string().email().optional()}).parse(req.body);res.status(201).json({client:await prisma.client.create({data:b})})}catch(e){next(e)}});
r.delete('/:id',roles(Role.ADMIN),async(req,res,next)=>{try{await prisma.client.delete({where:{id:req.params.id}});res.json({ok:true})}catch(e){next(e)}});export default r;
