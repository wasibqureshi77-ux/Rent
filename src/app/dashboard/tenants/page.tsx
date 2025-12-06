'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash, User } from 'lucide-react';

interface Tenant {
    _id: string;
    name: string;
    roomNo: string;
    phone: string;
    rentAmount: number;
    isActive: boolean;
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
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
    }, []);

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.roomNo.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tenants</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage all your renters here.</p>
                </div>
                <Link
                    href="/dashboard/tenants/add"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all"
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
                    <div className="mt-6">
                        <Link
                            href="/dashboard/tenants/add"
                            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                            New Tenant
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTenants.map((tenant) => (
                        <div key={tenant._id} className="relative flex flex-col bg-white dark:bg-card p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${tenant.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/10'}`}>
                                    {tenant.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <div className="flex gap-2">
                                    <button className="text-gray-400 hover:text-primary transition-colors">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    {/* We can implement delete logic later */}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {tenant.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{tenant.name}</h3>
                                    <p className="text-sm text-gray-500">Room {tenant.roomNo}</p>
                                </div>
                            </div>
                            <div className="mt-auto space-y-2 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Phone:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-300">{tenant.phone}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Rent:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-300">₹ {tenant.rentAmount}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
