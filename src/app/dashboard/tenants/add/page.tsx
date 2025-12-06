'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const tenantSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10, 'Valid phone number is required'),
    roomNo: z.string().min(1, 'Room number is required'),
    rentAmount: z.string().min(1, 'Rent amount is required').transform(val => Number(val)),
    securityDeposit: z.string().optional().transform(val => Number(val) || 0),
    joinedDate: z.string().optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

export default function AddTenantPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<TenantFormValues>({
        resolver: zodResolver(tenantSchema),
    });

    const onSubmit = async (data: TenantFormValues) => {
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                throw new Error('Failed to create tenant');
            }

            router.push('/dashboard/tenants');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/tenants" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Add New Tenant</h1>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                            <input
                                {...register('name')}
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="John Doe"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                            <input
                                {...register('phone')}
                                type="tel"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="9876543210"
                            />
                            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email (Optional)</label>
                            <input
                                {...register('email')}
                                type="email"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Number</label>
                            <input
                                {...register('roomNo')}
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="101"
                            />
                            {errors.roomNo && <p className="mt-1 text-sm text-red-600">{errors.roomNo.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rent (₹)</label>
                            <input
                                {...register('rentAmount')}
                                type="number"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="5000"
                            />
                            {errors.rentAmount && <p className="mt-1 text-sm text-red-600">{errors.rentAmount.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Security Deposit (₹)</label>
                            <input
                                {...register('securityDeposit')}
                                type="number"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="10000"
                            />
                            {errors.securityDeposit && <p className="mt-1 text-sm text-red-600">{errors.securityDeposit.message}</p>}
                        </div>

                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex justify-center rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Tenant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
