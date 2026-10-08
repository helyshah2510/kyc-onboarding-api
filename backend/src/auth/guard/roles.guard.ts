import {CanActivate,ExecutionContext,ForbiddenException,Injectable,} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorator/roles.decorator.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // read the sign on the door
        const allowedRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // no sign means any logged-in user may enter
        if (!allowedRoles || allowedRoles.length === 0) {
            return true;
        }

        // read the badge the JWT guard already checked
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const userRole = request.user?.role as Role | undefined;

        if (!userRole || !allowedRoles.includes(userRole)) {
            throw new ForbiddenException('You do not have permission to do this');
        }

        return true;
    }
}