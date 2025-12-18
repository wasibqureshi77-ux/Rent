'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Check, X } from 'lucide-react';

interface BillActionsProps {
    billId: string;
    currentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
}

export default function BillActions({ billId, currentStatus }: BillActionsProps) {
    const router = useRouter();
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/bills/${billId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                setStatus(newStatus as any);
                router.refresh(); // Refresh server component data
            }
        } catch (error) {
            console.error('Failed to update status', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/bills/${billId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                router.push('/dashboard/bills');
                router.refresh();
            } else {
                const errorData = await res.json();
                alert(`Failed to delete: ${errorData.message}`);
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to delete bill', error);
            alert('An error occurred while deleting.');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-4 print:hidden">
            {/* Status Update */}
            <div className="relative">
                <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={loading}
                    className={`appearance-none pl-3 pr-8 py-2 rounded-lg font-bold border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${status === 'PAID' ? 'border-green-500 text-green-600 bg-green-50 focus:ring-green-500' :
                        status === 'PARTIAL' ? 'border-yellow-500 text-yellow-600 bg-yellow-50 focus:ring-yellow-500' :
                            'border-red-500 text-red-600 bg-red-50 focus:ring-red-500'
                        }`}
                >
                    <option value="PENDING">PENDING</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                </select>
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${status === 'PAID' ? 'text-green-600' :
                    status === 'PARTIAL' ? 'text-yellow-600' :
                        'text-red-600'
                    }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </div>

            {/* Delete Button */}
            {!showDeleteConfirm ? (
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Bill"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            ) : (
                <div className="flex items-center gap-2 bg-red-50 p-1 pr-3 rounded-full border border-red-100 animate-in fade-in slide-in-from-right-4">
                    <span className="text-xs font-semibold text-red-600 pl-2">Delete?</span>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                        <Check className="h-3 w-3" />
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="p-1 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
