'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash, User, LogOut, UserPlus, X, Home, DoorOpen, Gauge, IndianRupee } from 'lucide-react';

interface Tenant {
    _id: string;
    fullName: string;
    roomNumber: string;
    phoneNumber: string;
    baseRent: number;
    isActive: boolean;
    propertyId?: any;
    roomId?: any;
    stats?: {
        lastMeterReading: number;
        totalDue: number;
        cycleEndDate: string;
    };
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Re-occupy Modal State
    const [showOccupyModal, setShowOccupyModal] = useState(false);
    const [occupyingTenant, setOccupyingTenant] = useState<Tenant | null>(null);
    const [properties, setProperties] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [occupyLoading, setOccupyLoading] = useState(false);
    const [occupyForm, setOccupyForm] = useState({
        propertyId: '',
        roomId: '',
        roomNumber: '',
        meterReadingStart: '',
        baseRent: '0'
    });

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = () => {
        setLoading(true);
        fetch('/api/tenants')
            .then((res) => res.json())
            .then((data) => {
                setTenants(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    const fetchProperties = async () => {
        try {
            const res = await fetch('/api/properties');
            const data = await res.json();
            setProperties(data);
        } catch (err) {
            console.error('Error fetching properties:', err);
        }
    };

    const fetchRooms = async (propertyId: string) => {
        try {
            const res = await fetch(`/api/rooms?propertyId=${propertyId}`);
            const data = await res.json();
            // Filter only vacant rooms
            setRooms(data.filter((r: any) => !r.currentTenantId));
        } catch (err) {
            console.error('Error fetching rooms:', err);
        }
    };

    const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const propId = e.target.value;
        setOccupyForm(prev => ({ ...prev, propertyId: propId, roomId: '', roomNumber: '', baseRent: '0' }));
        if (propId) fetchRooms(propId);
        else setRooms([]);
    };

    const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const roomId = e.target.value;
        const selectedRoom = rooms.find(r => r._id === roomId);
        setOccupyForm(prev => ({
            ...prev,
            roomId,
            roomNumber: selectedRoom?.roomNumber || '',
            meterReadingStart: selectedRoom?.currentMeterReading?.toString() || '0',
            baseRent: selectedRoom?.baseRent?.toString() || '0'
        }));
    };

    const filteredTenants = tenants.filter(t =>
        (t.fullName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.roomNumber?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tenant?')) return;

        try {
            const res = await fetch(`/api/tenants/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setTenants(prev => prev.filter(t => t._id !== id));
            } else {
                const errorData = await res.json();
                alert(errorData.message || 'Failed to delete tenant');
            }
        } catch (error) {
            console.error('Error deleting tenant:', error);
            alert('Error deleting tenant');
        }
    };

    const handleVacate = async (id: string) => {
        if (!confirm('Mark this tenant as left? This will make the room vacant again.')) return;

        try {
            const res = await fetch(`/api/tenants/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'vacate' })
            });

            if (res.ok) {
                setTenants(prev => prev.map(t =>
                    t._id === id ? { ...t, isActive: false } : t
                ));
            } else {
                const errorData = await res.json();
                alert(errorData.message || 'Failed to vacate tenant');
            }
        } catch (error) {
            console.error('Error vacating tenant:', error);
            alert('Error vacating tenant');
        }
    };

    const openOccupyModal = (tenant: Tenant) => {
        setOccupyingTenant(tenant);
        setOccupyForm({ propertyId: '', roomId: '', roomNumber: '', meterReadingStart: '', baseRent: '0' });
        fetchProperties();
        setShowOccupyModal(true);
    };

    const handleOccupySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!occupyingTenant || !occupyForm.propertyId || !occupyForm.roomId) return;

        setOccupyLoading(true);
        try {
            const res = await fetch(`/api/tenants/${occupyingTenant._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'occupy',
                    ...occupyForm
                })
            });

            if (res.ok) {
                setShowOccupyModal(false);
                fetchTenants(); // Refresh the list
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to occupy room');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating tenant');
        } finally {
            setOccupyLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tenants</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage all your renters here.</p>
                </div>
                <Link
                    href="/dashboard/tenants/add"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-all"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Tenant
                </Link>
            </div>

            <div className="flex items-center px-4 py-3 bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
                <Search className="h-5 w-5 text-gray-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search by name or room number..."
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredTenants.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-card rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <User className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No tenants found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new tenant.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTenants.map((tenant) => (
                        <div key={tenant._id} className="relative flex flex-col bg-white dark:bg-card p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${tenant.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/10'}`}>
                                    {tenant.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <div className="flex gap-2 text-gray-400">
                                    {tenant.isActive ? (
                                        <button
                                            onClick={() => handleVacate(tenant._id)}
                                            className="hover:text-primary transition-colors p-1"
                                            title="Vacate / Check-out"
                                        >
                                            <LogOut className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => openOccupyModal(tenant)}
                                            className="hover:text-green-600 transition-colors p-1"
                                            title="Assign New Room"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                        </button>
                                    )}
                                    <Link href={`/dashboard/tenants/${tenant._id}/edit`} className="hover:text-primary transition-colors p-1">
                                        <Edit2 className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(tenant._id)}
                                        className="hover:text-red-600 transition-colors p-1"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-blue-600 font-bold text-lg text-primary">
                                    {tenant.fullName?.charAt(0) || 'T'}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{tenant.fullName || 'Unknown'}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Home className="h-3 w-3" /> {tenant.propertyId?.name || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Room {tenant.roomNumber || 'N/A'} {tenant.roomId?.floorNumber && `• Floor ${tenant.roomId.floorNumber}`}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div className="grid grid-cols-2 gap-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Cycle Ends</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-200">
                                            {tenant.stats?.cycleEndDate
                                                ? new Date(tenant.stats.cycleEndDate).toLocaleDateString('en-GB')
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Last Meter</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-200">
                                            {tenant.stats?.lastMeterReading ?? 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Rent</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-200 flex items-center gap-1 text-primary">
                                            <IndianRupee className="h-3 w-3" /> {tenant.roomId?.baseRent ?? tenant.baseRent ?? 0}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Due Amount</p>
                                        <p className={`font-bold ${(tenant.stats?.totalDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            ₹ {tenant.stats?.totalDue || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Re-occupy Modal */}
            {showOccupyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-primary" /> Assign New Room
                            </h3>
                            <button onClick={() => setShowOccupyModal(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleOccupySubmit} className="p-6 space-y-5">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-2">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold">
                                    {occupyingTenant?.fullName?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Re-appointing Tenant</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{occupyingTenant?.fullName}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                        <Home className="h-4 w-4 text-gray-400" /> Select Property
                                    </label>
                                    <select
                                        required
                                        value={occupyForm.propertyId}
                                        onChange={handlePropertyChange}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    >
                                        <option value="">Choose a property...</option>
                                        {properties.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                        <DoorOpen className="h-4 w-4 text-gray-400" /> Select Vacant Room
                                    </label>
                                    <select
                                        required
                                        disabled={!occupyForm.propertyId}
                                        value={occupyForm.roomId}
                                        onChange={handleRoomChange}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none disabled:opacity-50"
                                    >
                                        <option value="">Choose a vacant room...</option>
                                        {rooms.map(r => (
                                            <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.floorNumber} Floor) - ₹{r.baseRent || 0}</option>
                                        ))}
                                    </select>
                                    {occupyForm.propertyId && rooms.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">No vacant rooms available in this property.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                        <Gauge className="h-4 w-4 text-gray-400" /> Starting Meter Reading
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={occupyForm.meterReadingStart}
                                        onChange={(e) => setOccupyForm(prev => ({ ...prev, meterReadingStart: e.target.value }))}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                        placeholder="0"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Meter reading at the time of entry.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                        <IndianRupee className="h-4 w-4 text-gray-400" /> Monthly Rent (₹)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={occupyForm.baseRent}
                                        onChange={(e) => setOccupyForm(prev => ({ ...prev, baseRent: e.target.value }))}
                                        className="w-full p-3 rounded-xl bg-orange-50/30 dark:bg-orange-900/10 border-2 border-primary/20 focus:border-primary focus:ring-primary focus:outline-none transition-all font-bold text-lg"
                                        placeholder="0"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Rent for this room. Auto-filled from room details.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={occupyLoading || !occupyForm.roomId}
                                className="w-full py-4 bg-primary hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none disabled:shadow-none mt-4"
                            >
                                {occupyLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </div>
                                ) : 'Appoint Room & Activate'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
