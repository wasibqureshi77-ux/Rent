'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
    _id: string;
    fullName: string;
    roomNumber: string;
    meterReadingStart: number;
    stats?: {
        lastMeterReading: number;
    };
}

export default function AddReadingPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [error, setError] = useState('');

    const watchedTenantId = watch('tenantId');

    useEffect(() => {
        fetch('/api/tenants?active=true')
            .then(res => res.json())
            .then(data => setTenants(data));
    }, []);

    useEffect(() => {
        if (watchedTenantId) {
            const tenant = tenants.find(t => t._id === watchedTenantId);
            setSelectedTenant(tenant || null);
        } else {
            setSelectedTenant(null);
        }
    }, [watchedTenantId, tenants]);

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

    const previousValue = selectedTenant?.stats?.lastMeterReading ?? selectedTenant?.meterReadingStart ?? 0;

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
                                <option key={t._id} value={t._id}>{t.fullName} (Room {t.roomNumber})</option>
                            ))}
                        </select>
                        {errors.tenantId && <p className="text-red-500 text-sm mt-1">Tenant is required</p>}
                    </div>

                    {selectedTenant && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300 flex justify-between">
                                <span>Previous Reading:</span>
                                <span className="font-bold">{previousValue} units</span>
                            </p>
                        </div>
                    )}

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
                        <label className="block text-sm font-medium mb-1">New Meter Reading (Units)</label>
                        <input
                            type="number"
                            step="any"
                            {...register('value', {
                                required: 'Value is required',
                                min: { value: previousValue, message: `New reading must be at least ${previousValue}` }
                            })}
                            className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="e.g. 1250"
                        />
                        {errors.value && <p className="text-red-500 text-sm mt-1">{(errors.value as any).message || 'Invalid value'}</p>}
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
