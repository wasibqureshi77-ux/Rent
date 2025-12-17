'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        propertyName: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/auth/register-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.requiresVerification) {
                setSuccess('Registration successful! Logging you in...');

                // Auto login
                const loginResult = await signIn('credentials', {
                    email: formData.email,
                    password: formData.password,
                    redirect: false,
                });

                if (loginResult?.error) {
                    setError('Auto-login failed. Please try logging in manually.');
                    setTimeout(() => router.push('/login'), 2000);
                } else {
                    router.push('/dashboard');
                }
            } else {
                setSuccess('Super admin account created! You can now login.');
                setTimeout(() => router.push('/login'), 3000);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 bg-white/70 dark:bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-800">
            <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                Create Account
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="John Owner"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="owner@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password *</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Confirm Password *</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone (Optional)</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        placeholder="9876543210"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Property Name (Optional)</label>
                    <input
                        type="text"
                        name="propertyName"
                        value={formData.propertyName}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        placeholder="My PG"
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
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
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
