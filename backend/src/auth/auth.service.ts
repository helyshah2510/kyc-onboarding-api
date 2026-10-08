import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomInt } from 'node:crypto';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { CompleteRegistrationDto } from './dto/complete-registration.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { RequestLoginDto } from './dto/request-login-otp.dto.js';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto.js';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    private async assertEmailAndPhoneAvailable(email: string, phone: string) {
        const existingEmail = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            throw new ConflictException("This Email already existed");
        }
        const existingPhone = await this.prisma.user.findUnique({
            where: { phone },
        });
        if (existingPhone) {
            throw new ConflictException("This phonenumber already existed");
        }
    }


    async StartRegistration(dto: RegisterDto) {
        await this.assertEmailAndPhoneAvailable(dto.email, dto.phone);

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const otp = randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.prisma.pendingRegistration.deleteMany({
            where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
        });

        await this.prisma.pendingRegistration.create({
            data: {
                name: dto.name,
                email: dto.email,
                passwordHash,
                phone: dto.phone,
                otpHash,
                expiresAt,
            },
        });

        console.log(`OTP for ${dto.phone}: ${otp}`);
        return { message: 'Otp sent to your phone' };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const pending = await this.prisma.pendingRegistration.findUnique({
            where: { phone: dto.phone },
        });

        if (!pending) {
            throw new BadRequestException('No registration found on this phone generate the otp first');
        }

        if (pending.expiresAt < new Date()) {
            throw new BadRequestException('Otp has been expired please generate the new one');
        }

        const isCorrect = await bcrypt.compare(dto.otp, pending.otpHash);
        if (!isCorrect) {
            throw new BadRequestException('Entered otp is not correct');
        }

        await this.prisma.pendingRegistration.update({
            where: { id: pending.id },
            data: { otpVerified: true }
        });
        return { message: 'phone verified' };
    }

    async completeRegistration(dto: CompleteRegistrationDto) {
        const pending = await this.prisma.pendingRegistration.findUnique({
            where: { phone: dto.phone },
        });

        if (!pending || !pending.otpVerified) {
            throw new BadRequestException('Your phone is not verified');
        }

        await this.assertEmailAndPhoneAvailable(pending.email, pending.phone);

        const [user] = await this.prisma.$transaction([
            this.prisma.user.create({
                data: {
                    name: pending.name,
                    email: pending.email,
                    phone: pending.phone,
                    password: pending.passwordHash,
                    phoneVerified: true,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    phoneVerified: true,
                    role: true,
                    createdAt: true,
                },
            }),
            this.prisma.pendingRegistration.delete({
                where: { id: pending.id },
            }),
        ]);
        return user;
    }

    //Login
    private async singleToken(user: { id: number; role: string; }) {
        const payload = { sub: user.id, role: user.role };
        return { accessToken: await this.jwtService.signAsync(payload) };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new UnauthorizedException('Invalid Email or password');
        }
        const isPasswordCorrect = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordCorrect) {
            throw new UnauthorizedException('Invalid Email or password');
        }
        return this.singleToken(user);
    }

    async requestLoginDto(dto: RequestLoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        })
        if (user) {
            const otp = randomInt(100000, 1000000).toString();
            const otpHash = await bcrypt.hash(otp, 10);
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

            // one active OTP per user: create it, or replace the old one

            await this.prisma.loginOtp.upsert({
                where: { userId: user.id },
                update: { otpHash, expiresAt, attempts: 0, createdAt: new Date() },
                create: { userId: user.id, otpHash, expiresAt },
            });

            console.log(`Login OTP for ${user.phone}: ${otp}`);
        }
        // same answer whether the phone exists or not
        return { message: 'If this number is registered, an OTP has been sent' };
    }

    async verifyLoginOtp(dto: VerifyLoginOtpDto) {
        const MAX_ATTEMPTS = 5;

        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
            include: { loginOtp: true },
        });

        const record = user?.loginOtp;
        if (!user || !record) {
            throw new UnauthorizedException('Invalid or expired otp');
        }

        // expired: it can never work again, so delete it now
        if (record.expiresAt < new Date()) {
            await this.prisma.loginOtp.delete({ where: { id: record.id } });
            throw new UnauthorizedException('OTP expired. Please request a new one');
        }

        const isCorrect = await bcrypt.compare(dto.otp, record.otpHash);
        const updated = await this.prisma.loginOtp.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
        });
        if (!isCorrect) {
            await this.prisma.loginOtp.update({
                where: { id: record.id },
                data: { attempts: { increment: 1 } },
            });

            // that was the last allowed try: now delete it
            if (updated.attempts >= MAX_ATTEMPTS) {
                await this.prisma.loginOtp.delete({ where: { id: record.id } });
                throw new UnauthorizedException(
                    'Too many wrong attempts. Please request a new OTP',
                );
            }

            const left = MAX_ATTEMPTS - updated.attempts;
            throw new UnauthorizedException(
                `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left`,
            );

        }
        //single use:delete it before handing out token
        await this.prisma.loginOtp.delete({ where: { id: record.id } });
        return this.singleToken(user);
    }
}
