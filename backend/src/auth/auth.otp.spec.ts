import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt';

describe('AuthService Registration OTP (Attempts & Expiration)', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      pendingRegistration: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    mockJwtService = {
      signAsync: vi.fn(),
    };
    authService = new AuthService(mockPrisma as any, mockJwtService as any);
  });

  it('successfully verifies OTP when valid', async () => {
    const rawOtp = '123456';
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const pending = {
      id: 1,
      phone: '9876543210',
      otpHash,
      expiresAt: new Date(Date.now() + 60000),
      otpVerified: false,
    };

    mockPrisma.pendingRegistration.findUnique.mockResolvedValue(pending);
    mockPrisma.pendingRegistration.update.mockResolvedValue({
      ...pending,
      otpVerified: true,
    });

    const result = await authService.verifyOtp({
      phone: '9876543210',
      otp: rawOtp,
    });

    expect(result).toEqual({ message: 'phone verified' });
    expect(mockPrisma.pendingRegistration.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { otpVerified: true },
    });
  });

  it('rejects expired OTP with proper message', async () => {
    const pending = {
      id: 2,
      phone: '9876543210',
      otpHash: 'somehash',
      expiresAt: new Date(Date.now() - 60000), // in the past
      otpVerified: false,
    };

    mockPrisma.pendingRegistration.findUnique.mockResolvedValue(pending);

    await expect(
      authService.verifyOtp({ phone: '9876543210', otp: '123456' }),
    ).rejects.toThrow('Otp has been expired please generate the new one');
  });

  it('tracks attempts and decrements remaining attempts on incorrect OTP', async () => {
    const rawOtp = '123456';
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const pending = {
      id: 3,
      phone: '9876543211',
      otpHash,
      expiresAt: new Date(Date.now() + 60000),
      otpVerified: false,
    };

    mockPrisma.pendingRegistration.findUnique.mockResolvedValue(pending);

    // 1st wrong attempt
    await expect(
      authService.verifyOtp({ phone: '9876543211', otp: '000000' }),
    ).rejects.toThrow('4 attempts left');

    // 2nd wrong attempt
    await expect(
      authService.verifyOtp({ phone: '9876543211', otp: '000001' }),
    ).rejects.toThrow('3 attempts left');
  });

  it('exhausts maximum 5 attempts, deletes pending registration, and locks out', async () => {
    const rawOtp = '654321';
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const pending = {
      id: 4,
      phone: '9876543212',
      otpHash,
      expiresAt: new Date(Date.now() + 60000),
      otpVerified: false,
    };

    mockPrisma.pendingRegistration.findUnique.mockResolvedValue(pending);
    mockPrisma.pendingRegistration.delete.mockResolvedValue(pending);

    // Attempts 1 to 4
    for (let i = 1; i <= 4; i++) {
      await expect(
        authService.verifyOtp({ phone: '9876543212', otp: '000000' }),
      ).rejects.toThrow('attempt');
    }

    // 5th attempt: should trigger lockout and delete pending registration
    await expect(
      authService.verifyOtp({ phone: '9876543212', otp: '000000' }),
    ).rejects.toThrow('Too many wrong attempts. Please request a new OTP');

    expect(mockPrisma.pendingRegistration.delete).toHaveBeenCalledWith({
      where: { id: 4 },
    });
  });
});
