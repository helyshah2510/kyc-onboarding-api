'use client';

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";

type Step = 1 | 2 | 3 | 4;

export default function RegisterPage() {
    const [step, setStep] = useState<Step>(1);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function run(action: () => Promise<void>) {
        setError('');
        setLoading(true);
        try {
            await action();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'something went wrong');
        } finally {
            setLoading(false);
        }
    }

    function handleStart(e: React.FormEvent) {
        e.preventDefault();
        run(async () => {
            await api('/auth/register/start', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    phone,
                }),
            });
            setStep(2);
        });
    }

    function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        run(async () => {
            await api('/auth/register/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ phone, otp }),
            });
            setStep(3);
        });
    }

    function handleComplete(e: React.FormEvent) {
        e.preventDefault();
        run(async () => {
            await api('/auth/register/complete', {
                method: 'POST',
                body: JSON.stringify({ phone }),
            });
            setStep(4);
        });
    }

    function startOver() {
        setStep(1);
        setOtp('');
        setError('');
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900';
    const buttonClass =
        'w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50';
    const linkButtonClass = 'w-full text-sm text-blue-600 hover:underline';

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
                <h1 className="text-2xl font-bold text-gray-900">Register</h1>
                {step < 4 && (
                    <p className="text-sm text-gray-500">Step {step} of 3</p>
                )}

                {step === 1 && (
                    <form onSubmit={handleStart} className="space-y-4">
                        <input
                            type="text"
                            placeholder="full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={inputClass}
                        />
                        <input
                            type="email"
                            placeholder="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputClass}
                        />
                        <input
                            type="password"
                            placeholder="password min 6 letters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className={inputClass}
                        />
                        <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Mobile number"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            required
                            className={inputClass}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button type="submit" disabled={loading} className={buttonClass}>
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}
                {step === 2 && (
                    <form onSubmit={handleVerify} className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Enter the 6-digit OTP sent to {phone}.
                        </p>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6 digit otp"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/, ''))}
                            required
                            className={inputClass}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button type="submit" disabled={loading} className={buttonClass}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button type="button" onClick={startOver} className={linkButtonClass}>
                            Change details
                        </button>
                    </form>
                )}
                {step === 3 && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Your phone {phone} is verified. Finish creating your account.
                        </p>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button
                            type="button"
                            onClick={handleComplete}
                            disabled={loading}
                            className={buttonClass}
                        >
                            {loading ? 'Creating account...' : 'Complete registration'}
                        </button>
                    </div>
                )}
                {step === 4 && (
                    <div className="space-y-4 text-center">
                        <p className="text-green-700">Your account has been created. you can log in now</p>
                        <Link
                            href="/login"
                            className="block w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                        >
                            Go to login
                        </Link>
                    </div>
                )}
                {step < 4 && (
                    <p className="text-center text-sm text-gray-600">
                        Already registered?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline">
                            Login
                        </Link>
                    </p>
                )}
            </div>
        </main>
    )

}