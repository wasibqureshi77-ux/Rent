'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import IdProofUpload from '@/components/tenants/IdProofUpload';

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [tenant, setTenant] = useState<any>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        alternatePhoneNumber: '',
        email: '',
        roomNumber: '',
        baseRent: '',
        meterReadingStart: '',
        startDate: '', // Added startDate
    });

    useEffect(() => {
        fetchTenant();
    }, [id]);

    const fetchTenant = async () => {
        try {
            const res = await fetch(`/api/tenants/${id}`);
            if (!res.ok) throw new Error('Failed to fetch tenant');

            const data = await res.json();
            setTenant(data);

            // Format start date to DD/MM/YYYY for input field
            let formattedDate = '';
            if (data.startDate) {
                const date = new Date(data.startDate);
                if (!isNaN(date.getTime())) {
                    // Force DD/MM/YYYY
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    formattedDate = `${day}/${month}/${year}`;
                }
            }

            setFormData({
                fullName: data.fullName || '',
                phoneNumber: data.phoneNumber || '',
                alternatePhoneNumber: data.alternatePhoneNumber || '',
                email: data.email || '',
                roomNumber: data.roomNumber || '',
                baseRent: data.baseRent?.toString() || '',
                meterReadingStart: data.meterReadingStart?.toString() || '0',
                startDate: formattedDate,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Parse DD/MM/YYYY to Date object
            let parsedDate: Date | undefined = undefined;
            if (formData.startDate) {
                const parts = formData.startDate.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const year = parseInt(parts[2], 10);
                    parsedDate = new Date(year, month, day);
                } else {
                    // Fallback check if it's somehow ISO (shouldn't be with my logic, but safe to check)
                    const fallback = new Date(formData.startDate);
                    if (!isNaN(fallback.getTime())) parsedDate = fallback;
                }
            }

            const payload = {
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                alternatePhoneNumber: formData.alternatePhoneNumber || undefined,
                email: formData.email || undefined,
                roomNumber: formData.roomNumber,
                baseRent: Number(formData.baseRent),
                meterReadingStart: Number(formData.meterReadingStart) || 0,
                startDate: parsedDate,
            };

            const res = await fetch(`/api/tenants/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to update tenant');
            }

            router.push('/dashboard/tenants');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/tenants" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Edit Tenant</h1>
            </div>

            {/* Basic Details Form */}
            <div className="bg-white dark:bg-transparent p-8 rounded-xl border border-gray-100 dark:border-none shadow-sm dark:shadow-none">
                <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Basic Details</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {/* Full Name */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Name *
                            </label>
                            <input
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Phone Number *
                            </label>
                            <input
                                name="phoneNumber"
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>

                        {/* Alternate Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Alternate Phone
                            </label>
                            <input
                                name="alternatePhoneNumber"
                                type="tel"
                                value={formData.alternatePhoneNumber}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>

                        {/* Email */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>

                        {/* Room Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Room Number *
                            </label>
                            <input
                                name="roomNumber"
                                type="text"
                                value={formData.roomNumber}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>

                        {/* Monthly Rent */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Monthly Rent (₹) *
                            </label>
                            <input
                                name="baseRent"
                                type="number"
                                value={formData.baseRent}
                                onChange={handleChange}
                                required
                                min="0"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Month Start Date
                            </label>
                            <div className="relative">
                                <input
                                    name="startDate"
                                    type="text"
                                    placeholder="DD/MM/YYYY"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 pr-10 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    const [year, month, day] = e.target.value.split('-');
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        startDate: `${day}/${month}/${year}`
                                                    }));
                                                }
                                            }}
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Used for billing cycle calculations
                            </p>
                        </div>

                        {/* Meter Reading Start */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Meter Reading Start
                            </label>
                            <input
                                name="meterReadingStart"
                                type="number"
                                value={formData.meterReadingStart}
                                onChange={handleChange}
                                min="0"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Initial electricity meter reading
                            </p>
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
                            {isSubmitting ? 'Updating...' : 'Update Tenant'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ID Proof Upload Section */}
            <IdProofUpload
                tenantId={id}
                existingProofs={tenant?.idProofs || []}
                onUploadComplete={fetchTenant}
            />
        </div>
    );
}
