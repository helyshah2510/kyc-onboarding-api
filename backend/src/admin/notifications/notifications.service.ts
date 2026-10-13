import { Injectable, Logger, } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async send(userId: number, applicationId: number, message: string) {
        try {
            const notification = await this.prisma.notification.create({
                data: { userId, applicationId, message },
            });

            this.logger.log(`Notification ${notification.id} saved for user ${userId}`);
            return notification;
        } catch (error) {
            // A failed notification should not break the main action
            this.logger.error(`Could not save notification for user ${userId}`, error);
            return null;
        }
    }
    listMine(userId: number) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, applicationId: true, message: true, readAt: true, createdAt: true },
        });
    }

    async markRead(id: number, userId: number) {
        // userId is in the search, so other users' notifications are invisible
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) {
            throw new NotFoundException('Notification not found');
        }
        if (notification.readAt) {
            return notification; // already read, keep the original time
        }
        return this.prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
    }
}