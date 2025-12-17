'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, RefreshCw, Calculator, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';

// Placeholder for QR Code (replace with actual path later)
const QR_PLACEHOLDER = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=mockupi@okaxis&pn=PGManagement';

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
    const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm({
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

    // Payment Collection Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<any>(null);
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
    const [collectedAmount, setCollectedAmount] = useState<number>(0);

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
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1;

        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0);
        const daysInMonth = monthEnd.getDate();

        const startDate = new Date(tenant.startDate);
        const endDate = tenant.endDate ? new Date(tenant.endDate) : null;

        let isPartial = false;
        let days = 0;

        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();

        if (startYear === year && startMonth === monthIndex) {
            isPartial = true;
            days = daysInMonth - startDate.getDate() + 1;
        }

        if (endDate) {
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth();

            if (endYear === year && endMonth === monthIndex) {
                isPartial = true;
                if (startYear === year && startMonth === monthIndex) {
                    days = endDate.getDate() - startDate.getDate() + 1;
                } else {
                    days = endDate.getDate();
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
                const [yearStr, monthStr] = month.split('-');
                const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
                const partial = Math.round((baseRent / daysInMonth) * Number(daysOccupied));
                setValue('rentAmount', partial);
            } else {
                if (!isPartialRent) {
                    setValue('rentAmount', baseRent);
                }
            }
        }
    }, [isPartialRent, daysOccupied, baseRent, month, setValue]);

    // Auto-Calculate Total
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

    const onFormSubmit = (data: any) => {
        // Validation for negative usage
        if (Number(data.currentReading) < Number(data.previousReading) && Number(data.currentReading) !== 0) {
            // Basic warning could go here
        }

        // Instead of API call, show Payment Modal
        setPendingFormData(data);
        setCollectedAmount(Math.round(data.totalAmount)); // Default to full payment
        setShowPaymentModal(true);
    };

    const confirmPaymentAndGenerate = async () => {
        if (!pendingFormData) return;

        setLoading(true);
        setError('');

        try {
            const tenant = tenants.find(t => t._id === pendingFormData.tenantId);
            if (!tenant) throw new Error('Selected tenant not found');

            const [yearStr, monthStr] = pendingFormData.month.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);

            const payload = {
                tenantId: pendingFormData.tenantId,
                propertyId: tenant.propertyId,
                month,
                year,
                startUnits: Number(pendingFormData.previousReading),
                endUnits: Number(pendingFormData.currentReading),
                unitsConsumed: Number(pendingFormData.electricityUsage),
                rentAmount: Number(pendingFormData.rentAmount),
                waterCharge: Number(pendingFormData.waterCharge),
                dueDate: pendingFormData.dueDate,

                // Payment Info
                collectedAmount: Number(collectedAmount),
                paymentMode: paymentMode
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
            // Close modal on error to show error message on main page
            setShowPaymentModal(false);
        } finally {
            setLoading(false);
        }
    };

    const remainingDueDisplay = (Number(pendingFormData?.totalAmount || 0) - collectedAmount);

    return (
        <div className="max-w-3xl mx-auto space-y-6 relative">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/bills" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Generate Bill</h1>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
                    {/* Tenant & Month Selection omitted for brevity - wait, MUST include fully */}
                    {/* Copied from previous view and maintained */}

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
                                    readOnly={true}
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
                        </div>

                        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading || !tenantId || !currentReading}
                            className="w-full mt-6 py-4 px-4 bg-primary hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Collect Payment'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-card w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Collect Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Total Payable</p>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                                    ₹{Math.round(pendingFormData?.totalAmount || 0).toLocaleString()}
                                </p>
                            </div>

                            {/* Payment Mode Tabs */}
                            <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setPaymentMode('CASH')}
                                    className={`py-2 text-sm font-semibold rounded-md transition-all ${paymentMode === 'CASH'
                                            ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Cash
                                </button>
                                <button
                                    onClick={() => setPaymentMode('UPI')}
                                    className={`py-2 text-sm font-semibold rounded-md transition-all ${paymentMode === 'UPI'
                                            ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    UPI
                                </button>
                            </div>

                            {paymentMode === 'UPI' && (
                                <div className="flex flex-col items-center justify-center space-y-3 py-4 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                    {/* QR Code Placeholder */}
                                    <div className="w-40 h-40 bg-white p-2 rounded-lg shadow-sm">
                                        <img src={QR_PLACEHOLDER} alt="Scan to Pay" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-xs text-gray-500">Scan QR to Pay via Billing App</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Amount Collected</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                                    <input
                                        type="number"
                                        value={collectedAmount}
                                        onChange={(e) => setCollectedAmount(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none text-lg font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-zinc-900/30 rounded-lg">
                                <span className="text-gray-600 dark:text-gray-400">Remaining Due:</span>
                                <span className={`font-bold ${remainingDueDisplay > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    ₹ {remainingDueDisplay.toLocaleString()}
                                </span>
                            </div>

                            <button
                                onClick={confirmPaymentAndGenerate}
                                disabled={loading}
                                className="w-full py-3 bg-primary hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                {loading ? 'Processing...' : `Confirm ${paymentMode === 'CASH' ? 'Cash' : 'UPI'} Payment`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
