'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
    _id: string;
    name: string;
    roomNo: string;
}

export default function AddReadingPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/tenants')
            .then(res => res.json())
            .then(data => setTenants(data));
    }, []);

    const onSubmit = async (data: any) => {
        setError('');
        try {
            const res = await fetch('/api/readings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const resData = await res.json();
            if (!res.ok) throw new Error(resData.message);

            router.push('/dashboard/readings');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/readings" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Add Meter Reading</h1>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Tenant / Room</label>
                        <select
                            {...register('tenantId', { required: 'Tenant is required' })}
                            className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="">Select a tenant...</option>
                            {tenants.map(t => (
                                <option key={t._id} value={t._id}>{t.name} (Room {t.roomNo})</option>
                            ))}
                        </select>
                        {errors.tenantId && <p className="text-red-500 text-sm mt-1">Tenant is required</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Reading Date</label>
                        <input
                            type="date"
                            {...register('readingDate', { required: 'Date is required' })}
                            className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            defaultValue={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Meter Reading (Units)</label>
                        <input
                            type="number"
                            step="any"
                            {...register('value', { required: 'Value is required', min: 0 })}
                            className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="e.g. 1250"
                        />
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                    >
                        Save Reading
                    </button>
                </form>
            </div>
        </div>
    );
}
