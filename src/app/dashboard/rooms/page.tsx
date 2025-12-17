'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Room {
    _id: string;
    propertyId: { _id: string; name: string };
    roomNumber: string;
    floorNumber: string;
    type: string;
    currentMeterReading?: number;
    currentKitchenMeterReading?: number;
    currentTenantId?: { fullName: string };
}

interface Property {
    _id: string;
    name: string;
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/properties')
            .then(res => res.json())
            .then(data => {
                setProperties(data);
                if (data.length > 0) {
                    setSelectedProperty(data[0]._id);
                } else {
                    setLoading(false);
                }
            });
    }, []);

    useEffect(() => {
        if (!selectedProperty) return;
        setLoading(true);
        fetch(`/api/rooms?propertyId=${selectedProperty}`)
            .then(res => res.json())
            .then(data => {
                setRooms(data);
                setLoading(false);
            });
    }, [selectedProperty]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Rooms Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage rooms and view occupancy status.</p>
                </div>
                <Link
                    href="/dashboard/rooms/add"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-all"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Room
                </Link>
            </div>

            {/* Property Filter */}
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Property</label>
                <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="w-full md:w-1/3 p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                    {properties.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-gray-500">Loading rooms...</div>
                ) : rooms.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Home className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No rooms found</h3>
                        <p className="text-gray-500">Add rooms to this property to get started.</p>
                    </div>
                ) : (
                    rooms.map((room) => (
                        <div key={room._id} className="bg-white dark:bg-card p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${room.currentTenantId ? 'bg-red-500' : 'bg-green-500'}`} />

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {room.type === 'ROOM_KITCHEN' ? 'Room + Kitchen' : room.type}
                                    </span>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-primary transition-colors">
                                        <Link href={`/dashboard/rooms/${room._id}/edit`}>
                                            {room.roomNumber}
                                        </Link>
                                    </h3>
                                    <p className="text-sm text-gray-500">Floor {room.floorNumber}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Meter: {room.currentMeterReading || 0}
                                        {room.type === 'ROOM_KITCHEN' && (
                                            <span className="ml-2 border-l border-gray-600 pl-2">Kitchen: {room.currentKitchenMeterReading || 0}</span>
                                        )}
                                    </p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${room.currentTenantId ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                    }`}>
                                    {room.currentTenantId ? 'Occupied' : 'Vacant'}
                                </div>
                            </div>

                            {room.currentTenantId ? (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Users className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-medium">{room.currentTenantId.fullName}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <span className="text-sm text-gray-400 italic">Available for rent</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
