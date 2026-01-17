'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, UserCheck, UserX, Pencil } from 'lucide-react';
import { signIn } from 'next-auth/react';
import EditUserModal from '@/components/admin/EditUserModal';

interface User {
    _id: string;
    name: string;
    email: string;
    isApproved: boolean; // This currently controls ACTIVE vs INACTIVE in backend logic
    isVerified: boolean;
    createdAt: string;
    propertyName?: string;
    phone?: string;
    subscription?: {
        status: 'ACTIVE' | 'INACTIVE' | 'OVERDUE';
        nextBillingDate: string | null;
        lastPaymentDate: string | null;
        planAmount: number;
    };
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/admin/users')
            .then(res => {
                if (res.status === 401) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) setUsers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isApproved: !currentStatus })
            });

            if (res.ok) {
                setUsers(users.map(u => u._id === userId ? { ...u, isApproved: !currentStatus } : u));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleImpersonate = async (userId: string) => {
        setProcessing(userId);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId })
            });

            if (!res.ok) throw new Error('Failed to generate token');

            const { token } = await res.json();

            // Sign in using the token
            await signIn('credentials', {
                impersonationToken: token,
                callbackUrl: '/dashboard'
            });
        } catch (error) {
            console.error('Impersonation failed', error);
            alert('Failed to login as user');
        } finally {
            setProcessing(null);
        }
    };

    const handleUserUpdate = (updatedUser: any) => {
        setUsers(users.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage property owner access and monthly rentals.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-900 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Mobile</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                                <th className="px-6 py-4 text-center">Edit</th>
                                <th className="px-6 py-4 text-right">Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-6">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-6 text-gray-500">No other users found.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id} className="bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-900/50 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {user.name}
                                            {user.propertyName && <div className="text-xs text-gray-500 font-normal">{user.propertyName}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {user.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isApproved
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                {user.isApproved ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleStatus(user._id, user.isApproved)}
                                                disabled={!user.isVerified}
                                                className={`p-2 rounded-lg transition-all ${!user.isVerified
                                                    ? 'text-gray-300 cursor-not-allowed'
                                                    : user.isApproved
                                                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                    }`}
                                                title={user.isApproved ? "Deactivate User" : "Activate User"}
                                            >
                                                {user.isApproved ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit User Details"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleImpersonate(user._id)}
                                                disabled={processing === user._id}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                            >
                                                {processing === user._id ? (
                                                    <span className="animate-pulse">Logging...</span>
                                                ) : (
                                                    <>
                                                        <Key className="h-3 w-3" /> Login as
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    onSuccess={handleUserUpdate}
                />
            )}
        </div>
    );
}
