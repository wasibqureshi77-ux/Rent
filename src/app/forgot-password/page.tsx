'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message || 'If an account exists with this email, you will receive a reset link shortly.');
            } else {
                setStatus('error');
                setMessage(data.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to send reset link. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
            <div className="absolute inset-0 overflow-hidden text-orange-500">
                <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-purple-400/20 blur-3xl" />
                <div className="absolute top-[60%] -right-[20%] w-[60%] h-[60%] rounded-full bg-amber-400/20 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="glass dark:glass-dark p-8 rounded-2xl shadow-xl">
                    <div className="mb-6">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Login
                        </Link>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                            Forgot Password?
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    {status === 'success' ? (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl text-center">
                            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">{message}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-4 text-sm underline hover:text-green-800"
                            >
                                Try another email
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                    required
                                    placeholder="your@email.com"
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-red-500 text-sm bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Sending Link...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
