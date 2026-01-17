'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface User {
    _id: string;
    name: string;
    email: string;
    propertyName?: string;
    phone?: string;
    subscription?: {
        status: 'ACTIVE' | 'INACTIVE' | 'OVERDUE';
        nextBillingDate: string | null;
        lastPaymentDate: string | null;
        planAmount: number;
    };
}

interface EditUserModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedUser: any) => void;
}

export default function EditUserModal({ user, isOpen, onClose, onSuccess }: EditUserModalProps) {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [propertyName, setPropertyName] = useState(user.propertyName || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Subscription states
    const [subStatus, setSubStatus] = useState(user.subscription?.status || 'INACTIVE');
    const [nextBillingDate, setNextBillingDate] = useState(
        user.subscription?.nextBillingDate ? new Date(user.subscription.nextBillingDate).toISOString().split('T')[0] : ''
    );
    const [planAmount, setPlanAmount] = useState(user.subscription?.planAmount || 0);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id,
                    name,
                    email,
                    propertyName,
                    phone,
                    password: password || undefined,
                    subscription: {
                        status: subStatus,
                        nextBillingDate: nextBillingDate || null,
                        planAmount: Number(planAmount)
                    }
                })
            });

            if (res.ok) {
                const updatedUser = await res.json();
                onSuccess(updatedUser);
                onClose();
            } else {
                alert('Failed to update user');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Edit User Details</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            placeholder="9876543210"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">PG Name (Property Name)</label>
                        <input
                            type="text"
                            value={propertyName}
                            onChange={(e) => setPropertyName(e.target.value)}
                            placeholder="e.g. Sunshine PG"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Subscription Management</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Status</label>
                                <select
                                    value={subStatus}
                                    onChange={(e) => setSubStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="OVERDUE">Overdue (Blocked)</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan Amount (Monthly)</label>
                                <input
                                    type="number"
                                    value={planAmount}
                                    onChange={(e) => setPlanAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Expiry (Next Billing Date)</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(nextBillingDate || Date.now());
                                            d.setMonth(d.getMonth() + 1);
                                            setNextBillingDate(d.toISOString().split('T')[0]);
                                        }}
                                        className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
                                    >
                                        +1 Month
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(nextBillingDate || Date.now());
                                            d.setFullYear(d.getFullYear() + 1);
                                            setNextBillingDate(d.toISOString().split('T')[0]);
                                        }}
                                        className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
                                    >
                                        +1 Year
                                    </button>
                                </div>
                            </div>
                            <input
                                type="date"
                                value={nextBillingDate}
                                onChange={(e) => setNextBillingDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 mt-2">
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-2 font-medium">Leave blank to keep current password</p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                                placeholder="******"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
