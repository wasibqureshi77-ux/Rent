'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Reading {
    _id: string;
    tenantId: { name: string; roomNo: string };
    readingDate: string;
    value: number;
    unitsConsumed: number;
}

export default function ReadingsPage() {
    const [readings, setReadings] = useState<Reading[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/readings')
            .then((res) => res.json())
            .then((data) => {
                setReadings(data);
                setLoading(false);
            });
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Meter Readings</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track electricity usage history.</p>
                </div>
                <Link
                    href="/dashboard/readings/add"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-all"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Reading
                </Link>
            </div>

            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-900 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Tenant / Room</th>
                                <th className="px-6 py-4">Reading (Units)</th>
                                <th className="px-6 py-4">Consumed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-6">Loading...</td></tr>
                            ) : readings.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-6 text-gray-500">No readings found.</td></tr>
                            ) : (
                                readings.map((reading) => (
                                    <tr key={reading._id} className="bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-900/50 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                {format(new Date(reading.readingDate), 'dd MMM yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 dark:text-white">{reading.tenantId?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">Room {reading.tenantId?.roomNo}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">
                                            {reading.value}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                {reading.unitsConsumed} units
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
