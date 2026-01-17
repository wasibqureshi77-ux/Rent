'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function SuperAdminSettingsPage() {
    const { data: session } = useSession();
    const { register, handleSubmit, setValue } = useForm();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                setValue('monthlyPlatformFee', data.monthlyPlatformFee);
                setValue('razorpayKeyId', data.razorpayKeyId);
                setValue('razorpayKeySecret', data.razorpayKeySecret);
            });
    }, [setValue]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    monthlyPlatformFee: data.monthlyPlatformFee,
                    razorpayKeyId: data.razorpayKeyId,
                    razorpayKeySecret: data.razorpayKeySecret
                }),
            });

            if (!res.ok) throw new Error('Failed to save');

            setMessage('Super Admin settings saved successfully!');
        } catch (err) {
            setMessage('Error saving settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
                <SettingsIcon className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">SU Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage global platform configurations.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <h2 className="text-lg font-semibold border-b pb-2">Platform Fees</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Monthly Platform Fee (for Property Owners)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                                type="number"
                                {...register('monthlyPlatformFee')}
                                className="w-full pl-8 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Property owners will be prompted to pay this amount monthly.</p>
                    </div>

                    <h2 className="text-lg font-semibold border-b pb-2 pt-4">Razorpay Configuration</h2>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Razorpay Key ID</label>
                            <input
                                type="text"
                                {...register('razorpayKeyId')}
                                placeholder="rzp_test_..."
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Razorpay Key Secret</label>
                            <input
                                type="password"
                                {...register('razorpayKeySecret')}
                                placeholder="••••••••••••••••"
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm text-center ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center w-full md:w-auto rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </button>
                </form>
            </div>
        </div>
    );
}
