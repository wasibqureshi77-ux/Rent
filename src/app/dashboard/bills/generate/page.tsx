'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, RefreshCw, Calculator, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
    _id: string;
    fullName: string;
    roomNumber: string;
    propertyId: string;
    startDate: string; // ISO date string
    endDate?: string; // ISO date string
}

export default function GenerateBillPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            tenantId: '',
            month: new Date().toISOString().slice(0, 7), // YYYY-MM
            previousReading: 0,
            currentReading: 0,
            electricityUsage: 0,
            electricityRate: 0,
            electricityAmount: 0,
            rentAmount: 0,
            waterCharge: 0,
            previousDues: 0,
            totalAmount: 0,
            dueDate: '',
            isPartialRent: false,
            daysOccupied: 0
        }
    });

    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');
    const [baseRent, setBaseRent] = useState(0);

    const values = watch();
    const {
        tenantId,
        month,
        currentReading,
        previousReading,
        isPartialRent,
        daysOccupied,
        rentAmount,
        waterCharge,
        electricityAmount,
        previousDues
    } = values;

    // Fetch tenants on mount
    useEffect(() => {
        fetch('/api/tenants')
            .then(res => res.json())
            .then(data => setTenants(data))
            .catch(err => console.error('Error fetching tenants:', err));
    }, []);

    // Initial fetch for previous reading and defaults when tenant/month selected
    useEffect(() => {
        if (tenantId && month) {
            fetchBillDetails(0);

            const tenant = tenants.find(t => t._id === tenantId);
            if (tenant) {
                // 1. Due Date Logic
                if (tenant.startDate) {
                    const startDate = new Date(tenant.startDate);
                    const startDay = startDate.getDate();

                    const [yearStr, monthStr] = month.split('-');
                    const selectedYear = parseInt(yearStr);
                    const selectedMonth = parseInt(monthStr);

                    let dueYear = selectedYear;
                    let dueMonth = selectedMonth + 1;
                    if (dueMonth > 12) {
                        dueMonth = 1;
                        dueYear++;
                    }

                    const dueMonthStr = dueMonth.toString().padStart(2, '0');
                    const dueDayStr = startDay.toString().padStart(2, '0');
                    setValue('dueDate', `${dueYear}-${dueMonthStr}-${dueDayStr}`);
                }

                // 2. Automatic Partial Days Calculation
                calculatePartialDays(tenant, month);
            }
        }
    }, [tenantId, month, tenants]);

    const calculatePartialDays = (tenant: Tenant, selectedMonth: string) => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr); // e.g. 2025
        const monthIndex = parseInt(monthStr) - 1; // 0-11. e.g. 11 for Dec

        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0); // Last day of month
        const daysInMonth = monthEnd.getDate();

        const startDate = new Date(tenant.startDate);
        const endDate = tenant.endDate ? new Date(tenant.endDate) : null;

        let isPartial = false;
        let days = 0;

        // Reset first to avoid stuck state
        // Check if Start Date is in this month
        // We compare Year and Month
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth(); // 0-11

        if (startYear === year && startMonth === monthIndex) {
            // Tenant moved in this month
            isPartial = true;
            // Days = (Total Days - Start Day) + 1
            // e.g. Started 5th. 31 - 5 + 1 = 27 days (5th to 31st inclusive)
            days = daysInMonth - startDate.getDate() + 1;
        }

        // Check if End Date is in this month (Moved out)
        if (endDate) {
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth();

            if (endYear === year && endMonth === monthIndex) {
                isPartial = true;
                // If matched start date too (started and ended same month)
                if (startYear === year && startMonth === monthIndex) {
                    days = endDate.getDate() - startDate.getDate() + 1;
                } else {
                    // Only ended this month
                    days = endDate.getDate(); // 1st to EndDate
                }
            }
        }

        if (isPartial) {
            setValue('isPartialRent', true);
            setValue('daysOccupied', days);
        } else {
            setValue('isPartialRent', false);
            setValue('daysOccupied', 0);
        }
    };

    // Calculate usage when readings change
    useEffect(() => {
        if (currentReading && previousReading) {
            const usage = Math.max(0, Number(currentReading) - Number(previousReading));
            setValue('electricityUsage', usage);
        }
    }, [currentReading, previousReading, setValue]);

    // Calculate electricity amount when usage or rate changes
    const electricityUsageVal = watch('electricityUsage');
    const electricityRateVal = watch('electricityRate');
    useEffect(() => {
        const amount = (Number(electricityUsageVal) || 0) * (Number(electricityRateVal) || 0);
        setValue('electricityAmount', amount);
    }, [electricityUsageVal, electricityRateVal, setValue]);

    // Handle Pro-rata Rent Logic
    useEffect(() => {
        if (baseRent > 0) {
            if (isPartialRent && Number(daysOccupied) > 0 && month) {
                // Calculate days in billing month
                const [yearStr, monthStr] = month.split('-');
                const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

                const partial = Math.round((baseRent / daysInMonth) * Number(daysOccupied));
                setValue('rentAmount', partial);
            } else {
                // Reset to base rent only if partial is unchecked or 0 days?
                // Actually, if isPartialRent becomes false, we reset to baseRent.
                if (!isPartialRent) {
                    setValue('rentAmount', baseRent);
                }
            }
        }
    }, [isPartialRent, daysOccupied, baseRent, month, setValue]);

    // Auto-Calculate Total Whenever Components Change
    useEffect(() => {
        const total =
            (Number(rentAmount) || 0) +
            (Number(waterCharge) || 0) +
            (Number(electricityAmount) || 0) +
            (Number(previousDues) || 0);

        setValue('totalAmount', total);
    }, [rentAmount, waterCharge, electricityAmount, previousDues, setValue]);

    const fetchBillDetails = async (usageOverride?: number) => {
        if (!tenantId || !month) return;

        setCalculating(true);
        setError('');

        try {
            const currentUsage = usageOverride !== undefined ? usageOverride : Math.max(0, (Number(currentReading) - Number(previousReading)));

            const res = await fetch(`/api/bills/calculate?tenantId=${tenantId}&month=${month}&usage=${currentUsage}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.message);

            setBaseRent(data.rentAmount);

            // If NOT partial rent (auto-detected), set full rent
            // If partial rent IS auto-detected, logic above sets days, and the Effect calculates partial rent.
            // But we have a race condition: defaults from API (full rent) vs auto-calc (partial).
            // Logic:
            // 1. `calculatePartialDays` runs on tenant/month change. Sets `isPartialRent` and `days`.
            // 2. `fetchBillDetails` runs on tenant/month change. Sets `baseRent`.
            // 3. Effect [isPartialRent, days, baseRent] runs. If partial, it overwrites rentAmount.
            // This should work fine.

            // However, we should set rentAmount here to base just in case, and let effect override.
            // But we must NOT unset partial rent if we just set it.
            // We only set rentAmount if we are NOT in partial mode? 
            // Or just set it and let effect fix it immediately?
            // "setValue" is async-ish in React Hook Form? No, sync.
            // If we set full rent here, checking `isPartialRent` (which might be updated by other effect?)
            // `isPartialRent` comes from `watch()`.

            // Safe bet: Set base rent to `rentAmount` initially (default).
            setValue('rentAmount', data.rentAmount);

            setValue('waterCharge', data.waterCharge);
            setValue('electricityRate', data.electricityRate);
            setValue('electricityAmount', data.electricityAmount);
            setValue('previousDues', data.previousDues);

            if (data.previousReading !== undefined) {
                setValue('previousReading', data.previousReading);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setCalculating(false);
        }
    };

    const handleCalculateClick = () => {
        const usage = Math.max(0, Number(currentReading) - Number(previousReading));
        fetchBillDetails(usage);
    };

    const onSubmit = async (data: any) => {
        if (Number(data.currentReading) < Number(data.previousReading) && Number(data.currentReading) !== 0) {
            // warning
        }

        setLoading(true);
        setError('');

        try {
            const tenant = tenants.find(t => t._id === data.tenantId);
            if (!tenant) throw new Error('Selected tenant not found');

            const [yearStr, monthStr] = data.month.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);

            const payload = {
                tenantId: data.tenantId,
                propertyId: tenant.propertyId,
                month,
                year,
                startUnits: Number(data.previousReading),
                endUnits: Number(data.currentReading),
                unitsConsumed: Number(data.electricityUsage),
                rentAmount: Number(data.rentAmount),
                waterCharge: Number(data.waterCharge),
                dueDate: data.dueDate
            };

            const res = await fetch('/api/bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to generate bill');
            }

            router.push('/dashboard/bills');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/bills" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Generate Bill</h1>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Tenant & Month Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Select Tenant *</label>
                            <select
                                {...register('tenantId', { required: 'Tenant is required' })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                <option value="">Choose a tenant...</option>
                                {tenants.map(t => (
                                    <option key={t._id} value={t._id}>{t.fullName} (Room {t.roomNumber})</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Billing Month *</label>
                            <input
                                type="month"
                                {...register('month', { required: 'Month is required' })}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Meter Readings and Calculation */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Previous Reading</label>
                            <input
                                type="number"
                                {...register('previousReading')}
                                readOnly
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border-none font-medium text-gray-600 dark:text-gray-400"
                            />
                            <p className="text-xs text-gray-500 mt-1">Auto-fetched</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-primary font-bold">Current Reading *</label>
                            <input
                                type="number"
                                {...register('currentReading', { required: true, min: 0 })}
                                className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900 border-2 border-primary/50 focus:border-primary focus:ring-0 focus:outline-none font-bold"
                                placeholder="Enter reading"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleCalculateClick}
                                disabled={calculating || !tenantId}
                                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {calculating ? <RefreshCw className="animate-spin h-4 w-4" /> : <Calculator className="h-4 w-4" />}
                                Calculate Bill
                            </button>
                        </div>
                    </div>

                    {/* Bill Breakdown */}
                    <div className="bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-lg space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Bill Breakdown</h3>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Electricity Usage:</span>
                                <span className="font-medium">{watch('electricityUsage')} units</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Rate per Unit:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        {...register('electricityRate')}
                                        className="w-16 p-1 text-right text-sm border-b border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-primary font-medium"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between col-span-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="font-medium">Electricity Amount:</span>
                                <span className="font-bold">₹{watch('electricityAmount')?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            {/* Rent Section with Partial Option */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-medium text-gray-500">Rent</label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register('isPartialRent')}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                        />
                                        <span className="text-xs text-primary font-medium">Partial/Pro-rata?</span>
                                    </label>
                                </div>
                                {isPartialRent && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="number"
                                            {...register('daysOccupied', { min: 1, max: 31 })}
                                            placeholder="Days"
                                            className="w-20 p-2 text-sm rounded border border-gray-200 dark:border-gray-700"
                                        />
                                        <span className="text-xs text-gray-500">days</span>
                                    </div>
                                )}
                                <input
                                    type="number"
                                    {...register('rentAmount')}
                                    readOnly={true} // Strict mode - only calculated
                                    className={`w-full p-2 rounded bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 text-right ${isPartialRent ? 'text-primary font-medium' : ''}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Water (Fixed)</label>
                                <input
                                    type="number"
                                    {...register('waterCharge')}
                                    className="w-full p-2 rounded bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-500">Prev. Dues</label>
                                {Number(previousDues) > 0 ? (
                                    <input
                                        type="number"
                                        {...register('previousDues')}
                                        className="w-full p-2 rounded bg-white dark:bg-zinc-900 border-red-200 dark:border-red-900 text-red-600 font-medium text-right focus:border-primary focus:outline-none"
                                    />
                                ) : (
                                    <div className="w-full p-2 flex items-center justify-end gap-1 text-green-600 dark:text-green-500 font-medium bg-green-50 dark:bg-green-900/10 rounded border border-green-100 dark:border-green-900/30">
                                        <span className="text-sm">Cleared</span>
                                        <CheckCircle2 className="h-3 w-3" />
                                        <input type="hidden" {...register('previousDues')} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Total & Submit */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Payable Amount</div>
                            <div className="text-3xl font-bold text-primary">₹{Math.round(watch('totalAmount') || 0).toLocaleString()}</div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Due Date</label>
                            <input
                                type="text"
                                value={watch('dueDate') ? new Date(watch('dueDate')).toLocaleDateString('en-GB') : ''}
                                readOnly
                                className="w-full md:w-1/3 p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 border-none font-medium text-gray-600 dark:text-gray-400 cursor-not-allowed"
                            />
                            <input
                                type="hidden"
                                {...register('dueDate', { required: true })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Calculated from Tenant's start day</p>
                        </div>

                        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading || !tenantId || !currentReading}
                            className="w-full mt-6 py-4 px-4 bg-primary hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Generating Bill...' : 'Generate Bill'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
