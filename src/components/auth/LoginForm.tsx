'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError(res.error);
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    return (
        <div className="w-full max-w-md p-8 glass dark:glass-dark rounded-2xl">
            <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                Welcome Back
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Email or Mobile Number</label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="Email or Mobile Number"
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium">Password</label>
                        <Link
                            href="/forgot-password"
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            Forgot Password?
                        </Link>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="••••••••"
                    />
                </div>
                {error && (
                    <p className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-2 rounded">
                        {error}
                    </p>
                )}
                <button
                    type="submit"
                    className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                    Sign In
                </button>
            </form>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-primary hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
