import { Role } from '@prisma/client';
export type AuthUser={id:string,name:string,email:string,role:Role};
export type AuthedRequest=import('express').Request & {user?:AuthUser};
