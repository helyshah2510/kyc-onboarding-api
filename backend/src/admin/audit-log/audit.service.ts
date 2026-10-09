import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";

export type AuditAction=
| 'APPLICATION_APPROVED'
| 'APPLICATION_REJECTED'
| 'ADDRESS_UPDATED'
| 'DOCUMENT_REPLACED'
| 'APPLICATION_DELETED'

@Injectable()
export class AuditService{
    constructor (private readonly prisma:PrismaService){}

    record(
        adminId:number,
        action:AuditAction,
        applicationId:number,
        details?:Prisma.InputJsonValue,
    ){
        return this.prisma.auditLog.create({
            data:{adminId,action,applicationId,details},
        });
    }
}