import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/guard/jwt-auth.guard.js';

describe('NotificationsController (Regression & Ownership)', () => {
  let controller: NotificationsController;
  let service: NotificationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new NotificationsService(mockPrisma as any);
    controller = new NotificationsController(service);
  });

  it('passes req.user.sub (not undefined) to listMine', async () => {
    const listMineSpy = vi.spyOn(service, 'listMine').mockResolvedValue([]);
    const fakeReq = {
      user: { sub: 42, role: 'USER' },
    } as unknown as AuthenticatedRequest;

    await controller.listMine(fakeReq);

    expect(listMineSpy).toHaveBeenCalledTimes(1);
    expect(listMineSpy).toHaveBeenCalledWith(42);
  });

  it('passes req.user.sub to markRead', async () => {
    const markReadSpy = vi.spyOn(service, 'markRead').mockResolvedValue({
      id: 10,
      userId: 42,
      applicationId: 1,
      message: 'test',
      readAt: new Date(),
      createdAt: new Date(),
    });
    const fakeReq = {
      user: { sub: 42, role: 'USER' },
    } as unknown as AuthenticatedRequest;

    await controller.markRead(10, fakeReq);

    expect(markReadSpy).toHaveBeenCalledTimes(1);
    expect(markReadSpy).toHaveBeenCalledWith(10, 42);
  });

  it('blocks cross-user notification marking in service (throws NotFoundException)', async () => {
    // When notification with id=99 does not belong to userId=42, findFirst returns null
    mockPrisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markRead(99, 42)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 99, userId: 42 },
    });
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });

  it('filters notifications strictly by the requesting user in service', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await service.listMine(42);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 42 },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        applicationId: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    });
  });
});
