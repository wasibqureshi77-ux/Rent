'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided');
            return;
        }

        const verifyEmail = async () => {
            try {
                const res = await fetch(`/api/verify-email?token=${token}`);
                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.message);
                }
            } catch (error) {
                setStatus('error');
                setMessage('An error occurred during verification');
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <div className="max-w-md w-full mx-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Verifying Email...
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please wait while we verify your email address.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Email Verified!
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="inline-block bg-primary hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-all"
                            >
                                Continue to Dashboard
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Verification Failed
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            <Link
                                href="/register"
                                className="inline-block bg-primary hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-all"
                            >
                                Back to Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <Suspense fallback={
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8">
                        <div className="text-center">
                            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Loading...
                            </h1>
                        </div>
                    </div>
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
