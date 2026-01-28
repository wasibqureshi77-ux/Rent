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
        fullName: '',
        phoneNumber: '',
        alternatePhoneNumber: '',
        email: '',
        startDate: new Date().toLocaleDateString('en-GB') // DD/MM/YYYY
    });

    interface AssignedRoom {
        roomId: string; // The ID
        roomNumber: string; // The number for display
        baseRent: string;
        meterReadingStart: string;
        floorNumber?: string;
    }

    const [assignedRooms, setAssignedRooms] = useState<AssignedRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState(''); // Temporary selection
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

    const handleAddRoom = () => {
        if (!selectedRoomId) return;
        const room = rooms.find(r => r._id === selectedRoomId);
        if (room) {
            setAssignedRooms(prev => [...prev, {
                roomId: room._id,
                roomNumber: room.roomNumber,
                floorNumber: room.floorNumber,
                baseRent: room.baseRent ? String(room.baseRent) : '',
                meterReadingStart: room.currentMeterReading ? String(room.currentMeterReading) : '0'
            }]);
            setSelectedRoomId(''); // Reset selection
        }
    };

    const handleRemoveRoom = (index: number) => {
        setAssignedRooms(prev => prev.filter((_, i) => i !== index));
    };

    const handleRoomChange = (index: number, field: keyof AssignedRoom, value: string) => {
        setAssignedRooms(prev => {
            const newRooms = [...prev];
            newRooms[index] = { ...newRooms[index], [field]: value };
            return newRooms;
        });
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

            if (assignedRooms.length === 0) {
                setError('Please assign at least one room.');
                setIsSubmitting(false);
                return;
            }

            const payload = {
                propertyId: formData.propertyId,
                rooms: assignedRooms.map(r => ({
                    roomId: r.roomId,
                    roomNumber: r.roomNumber,
                    baseRent: Number(r.baseRent),
                    meterReadingStart: Number(r.meterReadingStart) || 0
                })),
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                alternatePhoneNumber: formData.alternatePhoneNumber || undefined,
                email: formData.email || undefined,
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
                                setAssignedRooms([]); // Reset assigned rooms on property change
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

                    {/* Room Selection & Assignment */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Assign Rooms *
                        </label>

                        <div className="flex gap-2">
                            <select
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                disabled={!formData.propertyId || loadingRooms}
                                className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm disabled:opacity-50"
                            >
                                <option value="">{loadingRooms ? 'Loading rooms...' : 'Select a Room to Add'}</option>
                                {rooms.length > 0 ? (
                                    rooms.map(room => {
                                        const isAlreadyAssigned = assignedRooms.some(ar => ar.roomId === room._id);
                                        return (
                                            <option
                                                key={room._id}
                                                value={room._id}
                                                disabled={!!room.currentTenantId || isAlreadyAssigned}
                                                className={room.currentTenantId ? 'text-red-400' : isAlreadyAssigned ? 'text-gray-400' : 'text-green-600'}
                                            >
                                                {room.roomNumber} (Floor {room.floorNumber}) - ₹{room.baseRent || 0} {room.currentTenantId ? '- Occupied' : isAlreadyAssigned ? '- Selected' : '- Vacant'}
                                            </option>
                                        );
                                    })
                                ) : (
                                    <option value="" disabled>No rooms found.</option>
                                )}
                            </select>
                            <button
                                type="button"
                                onClick={handleAddRoom}
                                disabled={!selectedRoomId}
                                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>

                        {/* Assigned Rooms List */}
                        {assignedRooms.length > 0 && (
                            <div className="space-y-3 mt-4">
                                {assignedRooms.map((room, index) => (
                                    <div key={room.roomId} className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-gray-800 relative">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRoom(index)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove
                                        </button>
                                        <div className="mb-2 font-medium text-gray-900 dark:text-white">
                                            Room {room.roomNumber} <span className="text-gray-500 text-xs font-normal">(Floor {room.floorNumber})</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Rent (₹)</label>
                                                <input
                                                    type="number"
                                                    value={room.baseRent}
                                                    onChange={(e) => handleRoomChange(index, 'baseRent', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
                                                    placeholder="Rent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Meter Start</label>
                                                <input
                                                    type="number"
                                                    value={room.meterReadingStart}
                                                    onChange={(e) => handleRoomChange(index, 'meterReadingStart', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
                                                    placeholder="Reading"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="text-right text-sm font-semibold text-gray-900 dark:text-white">
                                    Total Rent: ₹{assignedRooms.reduce((sum, r) => sum + (Number(r.baseRent) || 0), 0)}
                                </div>
                            </div>
                        )}
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
                            disabled={isSubmitting || properties.length === 0 || assignedRooms.length === 0}
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
