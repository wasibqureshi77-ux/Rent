'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import DashboardStats from '@/components/dashboard/DashboardStats';

interface DashboardData {
    summary: {
        activeTenants: number;
        propertyCount: number;
        billsThisMonth: number;
        tenantsWithoutBills: number;
        totalOutstandingDue: number;
        currentMonth: number;
        currentYear: number;
        totalRevenue: number;
        totalBilled: number;
        electricityUsage: number;
        totalOccupancyMonths?: number;
    };
    tenantsWithoutBills: Array<{
        _id: string;
        fullName: string;
        roomNumber: string;
        propertyId: string;
    }>;
    pendingPayments: Array<{
        _id: string;
        tenantId: {
            fullName: string;
            roomNumber: string;
        };
        payments: {
            remainingDue: number;
        };
        createdAt: string;
    }>;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
                if (res.ok) {
                    const jsonData = await res.json();
                    setData(jsonData);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    Overview of your properties and tenants.
                </p>
            </div>

            <DashboardStats data={data?.summary} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pending Payments Section */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Pending Payments</h2>
                    <div className="space-y-4">
                        {!data?.pendingPayments || data.pendingPayments.length === 0 ? (
                            <p className="text-gray-500 text-sm">No pending payments.</p>
                        ) : (
                            data.pendingPayments.map((bill) => (
                                <div key={bill._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/80 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">
                                            {(bill.tenantId?.fullName || 'T').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{bill.tenantId?.fullName || 'Unknown Tenant'}</p>
                                            <p className="text-xs text-gray-500">Room {bill.tenantId?.roomNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-red-600">₹ {(bill.payments?.remainingDue || 0).toLocaleString()}</p>
                                        <p className="text-xs text-red-500">
                                            {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-GB') : 'Unknown Date'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Meter Readings Needed Section */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Meter Readings Needed</h2>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">The following rooms require new meter readings for the current month.</p>

                        {!data?.tenantsWithoutBills || data.tenantsWithoutBills.length === 0 ? (
                            <p className="text-gray-500 text-sm">All readings up to date.</p>
                        ) : (
                            data.tenantsWithoutBills.slice(0, 5).map((tenant) => (
                                <div key={tenant._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/80 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                                            {(tenant.fullName || 'T').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Room {tenant.roomNumber || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{tenant.fullName || 'Unknown Tenant'}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/dashboard/readings/add?tenantId=${tenant._id}`}
                                        className="text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-orange-600 transition-colors"
                                    >
                                        Add Reading
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
