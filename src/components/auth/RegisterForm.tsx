'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            setSuccess('Registration successful! Please login.');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="w-full max-w-md p-8 glass dark:glass-dark rounded-2xl">
            <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                Create Account
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="John Owner"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="owner@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>
                {error && (
                    <p className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-2 rounded">
                        {error}
                    </p>
                )}
                {success && (
                    <p className="text-green-500 text-sm text-center bg-green-100 dark:bg-green-900/30 p-2 rounded">
                        {success}
                    </p>
                )}
                <button
                    type="submit"
                    className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                    Sign Up
                </button>
            </form>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
