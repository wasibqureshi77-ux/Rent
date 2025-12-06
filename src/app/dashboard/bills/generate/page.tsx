'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
    _id: string;
    name: string;
    roomNo: string;
}

export default function GenerateBillPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');

    const selectedTenantId = watch('tenantId');
    const selectedMonth = watch('month');

    useEffect(() => {
        fetch('/api/tenants')
            .then(res => res.json())
            .then(data => setTenants(data));
    }, []);

    const calculateBill = async () => {
        if (!selectedTenantId || !selectedMonth) return;

        setCalculating(true);
        try {
            const res = await fetch(`/api/bills/calculate?tenantId=${selectedTenantId}&month=${selectedMonth}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.message);

            setValue('rentAmount', data.rentAmount);
            setValue('waterCharge', data.waterCharge);
            setValue('electricityUsage', data.electricityUsage);
            setValue('electricityRate', data.electricityRate);
            setValue('electricityAmount', data.electricityAmount);
            setValue('previousDues', data.previousDues);
            setValue('totalAmount', data.totalAmount);
            setValue('dueDate', new Date(selectedMonth + '-05').toISOString().split('T')[0]); // Default due date 5th

        } catch (err: any) {
            setError(err.message);
        } finally {
            setCalculating(false);
        }
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message);
            }

            router.push('/dashboard/bills');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/bills" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Generate Bill</h1>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Tenant</label>
                            <select
                                {...register('tenantId', { required: 'Tenant is required' })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                <option value="">Select a tenant...</option>
                                {tenants.map(t => (
                                    <option key={t._id} value={t._id}>{t.name} (Room {t.roomNo})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Billing Month</label>
                            <input
                                type="month"
                                {...register('month', { required: 'Month is required' })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={calculateBill}
                                disabled={calculating || !selectedTenantId || !selectedMonth}
                                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {calculating ? <RefreshCw className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                                Fetch Details
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Rent Amount</label>
                            <input
                                type="number"
                                {...register('rentAmount', { required: true })}
                                readOnly
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border-none cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Water Bill</label>
                            <input
                                type="number"
                                {...register('waterCharge', { required: true })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Elec. Usage (Units)</label>
                            <input
                                type="number"
                                {...register('electricityUsage', { required: true })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Elec. Rate</label>
                            <input
                                type="number"
                                {...register('electricityRate', { required: true })}
                                readOnly
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border-none cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Elec. Amount</label>
                            <input
                                type="number"
                                {...register('electricityAmount', { required: true })}
                                readOnly
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border-none cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Previous Dues</label>
                            <input
                                type="number"
                                {...register('previousDues')}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-lg font-bold mb-1 text-primary">Total Amount</label>
                            <input
                                type="number"
                                {...register('totalAmount', { required: true })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border-2 border-primary focus:outline-none text-xl font-bold"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Due Date</label>
                            <input
                                type="date"
                                {...register('dueDate', { required: true })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate Bill'}
                    </button>
                </form>
            </div>
        </div>
    );
}
