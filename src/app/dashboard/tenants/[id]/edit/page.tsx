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

    const [roomsData, setRoomsData] = useState<any[]>([]);

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

            // Initialize rooms data
            if (data.rooms && data.rooms.length > 0) {
                setRoomsData(data.rooms);
            } else {
                // Fallback for legacy single-room tenants
                setRoomsData([{
                    roomId: data.roomId?._id || data.roomId,
                    roomNumber: data.roomNumber,
                    baseRent: data.baseRent,
                    meterReadingStart: data.meterReadingStart
                }]);
            }

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

    const handleRoomChange = (index: number, field: string, value: string) => {
        const updatedRooms = [...roomsData];
        updatedRooms[index] = {
            ...updatedRooms[index],
            [field]: value
        };
        setRoomsData(updatedRooms);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Parse Date manually to ensure correct local/UTC handling
            let parsedDate: Date | undefined = undefined;
            if (formData.startDate) {
                // Support DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
                const parts = formData.startDate.split(/[\/\-\.]/);

                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const year = parseInt(parts[2], 10);

                    // Basic validation
                    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                        parsedDate = new Date(year, month, day, 12, 0, 0);
                    }
                }

                // If regex split didn't work or validation failed, try standard constructor
                if (!parsedDate || isNaN(parsedDate.getTime())) {
                    const fallback = new Date(formData.startDate);
                    if (!isNaN(fallback.getTime())) {
                        parsedDate = fallback;
                    }
                }

                if (!parsedDate || isNaN(parsedDate.getTime())) {
                    setError('Invalid Date Format. Please use DD/MM/YYYY');
                    setIsSubmitting(false);
                    return;
                }
            }

            const payload = {
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                alternatePhoneNumber: formData.alternatePhoneNumber || undefined,
                email: formData.email || undefined,
                startDate: parsedDate,

                // Send updated rooms array
                rooms: roomsData.map(r => ({
                    roomId: r.roomId._id || r.roomId, // Ensure we send ID
                    roomNumber: r.roomNumber,
                    baseRent: Number(r.baseRent),
                    meterReadingStart: Number(r.meterReadingStart) || 0
                })),

                // For legacy compatibility, update top-level fields based on first room
                roomNumber: roomsData[0]?.roomNumber,
                baseRent: Number(roomsData[0]?.baseRent),
                meterReadingStart: Number(roomsData[0]?.meterReadingStart)
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

                        {/* Start Date */}
                        <div className="sm:col-span-2 md:col-span-1">
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

                        {/* Rooms Section */}
                        <div className="sm:col-span-2 space-y-4">
                            <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b pb-2">Assigned Rooms</h3>
                            {roomsData.map((room, index) => (
                                <div key={index} className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-gray-800 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Room Number (Read Only usually, but let's see) */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Room Number</label>
                                            <input
                                                type="text"
                                                value={room.roomNumber || ''}
                                                disabled
                                                className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Monthly Rent */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Rent (₹)</label>
                                            <input
                                                type="number"
                                                value={room.baseRent}
                                                onChange={(e) => handleRoomChange(index, 'baseRent', e.target.value)}
                                                className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
                                            />
                                        </div>

                                        {/* Meter Reading Start */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Meter Reading</label>
                                            <input
                                                type="number"
                                                value={room.meterReadingStart}
                                                onChange={(e) => handleRoomChange(index, 'meterReadingStart', e.target.value)}
                                                className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
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
