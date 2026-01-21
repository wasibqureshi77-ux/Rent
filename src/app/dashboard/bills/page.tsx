'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, Download } from 'lucide-react';

interface Bill {
    _id: string;
    tenantId: { fullName: string; roomNumber: string };
    month: number;
    year: number;
    amounts: {
        totalAmount: number;
    };
    payments: {
        amountPaid: number;
        remainingDue: number;
    };
    status: string;
}

export default function BillsPage() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/bills')
            .then(res => res.json())
            .then(data => {
                setBills(data);
                setLoading(false);
            });
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Bills</h1>
                    <p className="text-gray-500 dark:text-gray-400">View and manage monthly bills.</p>
                </div>
                <Link
                    href="/dashboard/bills/generate"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-all"
                >
                    <Plus className="h-4 w-4 mr-2" /> Generate Bill
                </Link>
            </div>

            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-900 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Month</th>
                                <th className="px-6 py-4">Tenant</th>
                                <th className="px-6 py-4">Total Amount</th>
                                <th className="px-6 py-4">Due</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-6">Loading...</td></tr>
                            ) : bills.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-6 text-gray-500">No bills generated yet.</td></tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill._id} className="bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-900/50 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {(() => {
                                                const date = new Date();
                                                date.setMonth(Number(bill.month) - 1);
                                                return date.toLocaleString('default', { month: 'long' });
                                            })()} {bill.year}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 dark:text-white">{bill.tenantId?.fullName || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">Room {bill.tenantId?.roomNumber || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold">
                                            ₹ {bill.amounts?.totalAmount?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-red-500">
                                            {bill.payments?.remainingDue > 0 ? `₹ ${bill.payments.remainingDue.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${bill.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/dashboard/bills/${bill._id}`} className="text-gray-400 hover:text-primary transition-colors">
                                                <FileText className="h-4 w-4" />
                                            </Link>
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
