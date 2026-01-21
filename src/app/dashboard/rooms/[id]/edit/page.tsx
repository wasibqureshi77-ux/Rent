'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

interface Property {
    _id: string;
    name: string;
}

export default function EditRoomPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/properties').then(res => res.json()),
            fetch(`/api/rooms/${id}`).then(res => res.json())
        ]).then(([propsData, roomData]) => {
            setProperties(propsData || []);
            if (roomData) {
                setValue('propertyId', roomData.propertyId);
                setValue('floorNumber', roomData.floorNumber);
                setValue('roomNumber', roomData.roomNumber);
                setValue('type', roomData.type);
                setValue('currentMeterReading', roomData.currentMeterReading);
                setValue('currentKitchenMeterReading', roomData.currentKitchenMeterReading);
                setValue('baseRent', roomData.baseRent);
            }
            setInitialLoading(false);
        }).catch(err => {
            console.error(err);
            setError('Failed to load data');
            setInitialLoading(false);
        });
    }, [id, setValue]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/rooms/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }

            router.push('/dashboard/rooms');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this room? This cannot be undone.')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/rooms/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }

            router.push('/dashboard/rooms');
            router.refresh();
        } catch (err: any) {
            alert(err.message);
            setLoading(false);
        }
    };

    if (initialLoading) return <div className="p-8 text-center text-gray-500">Loading room details...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/rooms" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Edit Room</h1>
                </div>
                <button
                    onClick={handleDelete}
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <Trash2 className="h-4 w-4" /> Delete Room
                </button>
            </div>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Property</label>
                        <select
                            {...register('propertyId', { required: 'Property is required' })}
                            className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="">Select Property</option>
                            {properties.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                        {errors.propertyId && <p className="text-red-500 text-sm mt-1">{String(errors.propertyId.message)}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Floor Number</label>
                            <input
                                type="text"
                                {...register('floorNumber', { required: 'Floor Number is required' })}
                                placeholder="e.g. 1, G, 2"
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            {errors.floorNumber && <p className="text-red-500 text-sm mt-1">{String(errors.floorNumber.message)}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Room / Flat Number</label>
                            <input
                                type="text"
                                {...register('roomNumber', { required: 'Room Number is required' })}
                                placeholder="e.g. 101, A-2"
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            {errors.roomNumber && <p className="text-red-500 text-sm mt-1">{String(errors.roomNumber.message)}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-lg has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                <input type="radio" value="ROOM" {...register('type')} className="text-primary focus:ring-primary" />
                                <span className="text-sm font-medium">Room</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-lg has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                <input type="radio" value="FLAT" {...register('type')} className="text-primary focus:ring-primary" />
                                <span className="text-sm font-medium">Flat</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-lg has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                <input type="radio" value="ROOM_KITCHEN" {...register('type')} className="text-primary focus:ring-primary" />
                                <span className="text-sm font-medium">Room + Kitchen</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Monthly Rent (₹)</label>
                        <input
                            type="number"
                            {...register('baseRent', { required: 'Room rent is required' })}
                            placeholder="e.g. 15000"
                            min="0"
                            className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold text-lg"
                        />
                        {errors.baseRent && <p className="text-red-500 text-sm mt-1">{String(errors.baseRent.message)}</p>}
                    </div>

                    {/* Current Meter Readings */}
                    {watch('type') === 'ROOM_KITCHEN' ? (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Room Meter Reading</label>
                                <input
                                    type="number"
                                    {...register('currentMeterReading')}
                                    placeholder="0"
                                    min="0"
                                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-gray-500">Update room unit.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kitchen Meter Reading</label>
                                <input
                                    type="number"
                                    {...register('currentKitchenMeterReading')}
                                    placeholder="0"
                                    min="0"
                                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-gray-500">Update kitchen unit.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Meter Reading</label>
                            <input
                                type="number"
                                {...register('currentMeterReading')}
                                placeholder="0"
                                min="0"
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-500">Update the current recorded reading for this room.</p>
                        </div>
                    )}

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving Changes...' : <><Save className="h-5 w-5" /> Save Changes</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
