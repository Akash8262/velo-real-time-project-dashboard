import {Router} from 'express'; import {z} from 'zod'; import {prisma} from '../utils/prisma'; import {auth,roles} from '../middleware/auth'; import {Role,TaskStatus,Priority,NotificationType} from '@prisma/client'; import {emitActivity,emitNotification} from '../sockets/socket';
const r=Router();r.use(auth);
const projectBody=z.object({name:z.string().min(2),description:z.string().default(''),clientId:z.string(),managerId:z.string().optional()});
function canProject(u:any,p:any){return u.role===Role.ADMIN||p.managerId===u.id}
r.get('/', async (req: any, res, next) => {
  try {
    if (req.user.role === Role.DEVELOPER) {
      const projects = await prisma.project.findMany({
        where: {
          tasks: {
            some: {
              developerId: req.user.id,
            },
          },
        },
        include: {
          client: true,
          manager: true,
          tasks: {
            where: {
              developerId: req.user.id,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        projects: projects.map((project: any) => ({
          ...project,
          taskCount: project.tasks.length,
          tasks: undefined,
        })),
      });
    }

    const where =
      req.user.role === Role.ADMIN
        ? {}
        : { managerId: req.user.id };

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        manager: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({ projects });
  } catch (e) {
    next(e);
  }
});
r.post('/',roles(Role.ADMIN,Role.PM),async(req:any,res,next)=>{try{const b=projectBody.parse(req.body);const managerId=req.user.role===Role.PM?req.user.id:(b.managerId||req.user.id);const p=await prisma.project.create({data:{name:b.name,description:b.description,clientId:b.clientId,managerId}});res.status(201).json({project:p})}catch(e){next(e)}});
r.get('/:id',async(req:any,res,next)=>{try{const p=await prisma.project.findUnique({where:{id:req.params.id},include:{client:true,manager:true,tasks:{include:{developer:true},orderBy:{dueDate:'asc'}}}});if(!p)return res.status(404).json({error:{code:'NOT_FOUND',message:'Project not found'}});if(!canProject(req.user,p)&&req.user.role!==Role.DEVELOPER)return res.status(403).json({error:{code:'FORBIDDEN',message:'Project access denied'}});if(req.user.role===Role.DEVELOPER)p.tasks=p.tasks.filter((t:any)=>t.developerId===req.user.id);res.json({project:p})}catch(e){next(e)}});
r.post('/:id/tasks',roles(Role.ADMIN,Role.PM),async(req:any,res,next)=>{try{const p=await prisma.project.findUnique({where:{id:req.params.id}});if(!p||!canProject(req.user,p))return res.status(403).json({error:{code:'FORBIDDEN',message:'Project access denied'}});const b=z.object({title:z.string().min(2),description:z.string().default(''),developerId:z.string(),status:z.nativeEnum(TaskStatus).default(TaskStatus.TODO),priority:z.nativeEnum(Priority).default(Priority.MEDIUM),dueDate:z.coerce.date()}).parse(req.body);const t=await prisma.task.create({data:{...b,projectId:p.id}});const n=await prisma.notification.create({data:{userId:b.developerId,taskId:t.id,type:NotificationType.TASK_ASSIGNED,message:`You were assigned ${t.title}`}});emitNotification(b.developerId,n);res.status(201).json({task:t})}catch(e){next(e)}});
export default r;
