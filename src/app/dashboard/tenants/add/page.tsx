'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddTenantPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [properties, setProperties] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        propertyId: '',
        roomId: '', // Link by ID
        fullName: '',
        phoneNumber: '',
        alternatePhoneNumber: '',
        email: '',
        roomNumber: '',
        baseRent: '',
        meterReadingStart: '',
        startDate: new Date().toLocaleDateString('en-GB') // DD/MM/YYYY
    });

    const [rooms, setRooms] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            const res = await fetch('/api/properties');
            if (res.ok) {
                const data = await res.json();
                setProperties(data);
                if (data.length > 0) {
                    const firstPropId = data[0]._id;
                    setFormData(prev => ({ ...prev, propertyId: firstPropId }));
                    fetchRooms(firstPropId);
                }
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        }
    };

    const fetchRooms = async (propertyId: string) => {
        setLoadingRooms(true);
        try {
            const res = await fetch(`/api/rooms?propertyId=${propertyId}`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                    // Fallback
                    const fallback = new Date(formData.startDate);
                    if (!isNaN(fallback.getTime())) parsedDate = fallback;
                }
            }

            const payload = {
                propertyId: formData.propertyId,
                roomId: formData.roomId,
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                alternatePhoneNumber: formData.alternatePhoneNumber || undefined,
                email: formData.email || undefined,
                roomNumber: formData.roomNumber,
                baseRent: Number(formData.baseRent),
                meterReadingStart: Number(formData.meterReadingStart) || 0,
                startDate: parsedDate
            };

            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to create tenant');
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

            <div className="bg-white dark:bg-transparent p-8 rounded-xl border border-gray-100 dark:border-none shadow-sm dark:shadow-none">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Property Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Property *
                        </label>
                        <select
                            name="propertyId"
                            value={formData.propertyId}
                            onChange={(e) => {
                                handleChange(e);
                                fetchRooms(e.target.value);
                                setFormData(prev => ({ ...prev, roomNumber: '' })); // Reset room
                            }}
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        >
                            {properties.length === 0 ? (
                                <option value="">No properties available</option>
                            ) : (
                                properties.map(prop => (
                                    <option key={prop._id} value={prop._id}>
                                        {prop.name}
                                    </option>
                                ))
                            )}
                        </select>
                        {properties.length === 0 && (
                            <p className="mt-1 text-sm text-amber-600">
                                Please create a property first before adding tenants.
                            </p>
                        )}
                    </div>

                    {/* Room Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select Room *
                        </label>
                        <select
                            name="roomId" // Changed from roomNumber to roomId
                            value={formData.roomId}
                            onChange={(e) => {
                                const selectedRoomId = e.target.value;
                                const selectedRoom = rooms.find(r => r._id === selectedRoomId);
                                setFormData(prev => ({
                                    ...prev,
                                    roomId: selectedRoomId,
                                    roomNumber: selectedRoom ? selectedRoom.roomNumber : '', // Auto-fill room number text for display/legacy
                                    meterReadingStart: selectedRoom?.currentMeterReading ? String(selectedRoom.currentMeterReading) : '' // Auto-fill meter
                                }));
                            }}
                            required
                            disabled={!formData.propertyId || loadingRooms}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm disabled:opacity-50"
                        >
                            <option value="">{loadingRooms ? 'Loading rooms...' : 'Select a Room'}</option>
                            {rooms.length > 0 ? (
                                rooms.map(room => (
                                    <option
                                        key={room._id}
                                        value={room._id} // Value is now ID
                                        disabled={!!room.currentTenantId}
                                        className={room.currentTenantId ? 'text-red-400' : 'text-green-600'}
                                    >
                                        {room.roomNumber} (Floor {room.floorNumber}) {room.currentTenantId ? '- Occupied' : '- Vacant'}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No rooms found. Add rooms first.</option>
                            )}
                        </select>
                    </div>

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
                                placeholder="John Doe"
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
                                placeholder="9876543210"
                            />
                        </div>

                        {/* Alternate Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Alternate Phone (Optional)
                            </label>
                            <input
                                name="alternatePhoneNumber"
                                type="tel"
                                value={formData.alternatePhoneNumber}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="9123456789"
                            />
                        </div>

                        {/* Email */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email (Optional)
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder:text-gray-400 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="john@example.com"
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
                                placeholder="5000"
                            />
                        </div>

                        {/* Meter Reading Start - NEW FIELD */}
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
                                placeholder="0"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Initial electricity meter reading
                            </p>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Start Date
                            </label>
                            <div className="relative">
                                <input
                                    name="startDate"
                                    type="text"
                                    placeholder="DD/MM/YYYY"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white px-3 py-2 pr-10 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
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
                            disabled={isSubmitting || properties.length === 0}
                            className="inline-flex justify-center rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Tenant'}
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Note: You can upload ID proofs after creating the tenant
                    </p>
                </form>
            </div>
        </div>
    );
}
