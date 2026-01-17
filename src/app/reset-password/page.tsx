'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        console.log('Current token from URL:', token);
        if (token) {
            setStatus('idle');
            setMessage('');
        } else if (token === null) {
            // Only show error if token is truly null after a short delay
            const timer = setTimeout(() => {
                if (!token) {
                    setStatus('error');
                    setMessage('Missing or invalid reset token.');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters long.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage('Your password has been reset successfully.');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setStatus('error');
                setMessage(data.message || 'Failed to reset password. The link may have expired.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('An unexpected error occurred. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center space-y-4 py-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Password Updated!</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Your password has been successfully reset. Redirecting you to the login page...
                </p>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-md"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'error' && (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid'))) {
        return (
            <div className="text-center space-y-4 py-4">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Link Expired</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    This password reset link is invalid or has already expired for security reasons.
                </p>
                <div className="pt-4 space-y-3">
                    <Link
                        href="/forgot-password"
                        className="w-full inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-md"
                    >
                        Request New Link
                    </Link>
                    <Link
                        href="/login"
                        className="block text-sm text-gray-500 hover:text-primary transition-colors"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>
            </div>

            {status === 'error' && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'loading' || !token}
                className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {status === 'loading' ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Resetting Password...
                    </>
                ) : (
                    'Reset Password'
                )}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-purple-400/20 blur-3xl" />
                <div className="absolute top-[60%] -right-[20%] w-[60%] h-[60%] rounded-full bg-amber-400/20 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="glass dark:glass-dark p-8 rounded-2xl shadow-xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                            Set New Password
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Please enter your new password below.
                        </p>
                    </div>

                    <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
