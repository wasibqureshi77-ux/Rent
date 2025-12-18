'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [showPopup, setShowPopup] = useState(false);
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        const checkSubscription = async () => {
            if (!session || session.user.role === 'SUPER_ADMIN' || session.user.role === 'super_admin') return;

            // Fetch user subscription status
            try {
                // We'll add a specific endpoint to check self status or just use the session if it's updated frequently.
                // Better: fetch profile/status
                const res = await fetch('/api/auth/me'); // We might need to create this or query user details
                // Actually, let's just make a quick check API or use session if I add it to callbacks.
                // Session is safer but might be stale.
                // Let's create a specific check endpoint.
                const subRes = await fetch('/api/subscription/status');
                if (subRes.ok) {
                    const data = await subRes.json();
                    if (data.isOverdue) {
                        setAmount(data.fee);
                        setShowPopup(true);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };

        if (session) {
            checkSubscription();
        }
    }, [session]);

    if (!showPopup) return <>{children}</>;

    return (
        <>
            {children}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-200 dark:border-red-900 animation-fade-in-up">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle className="h-8 w-8" />
                        <h2 className="text-xl font-bold">Subscription Payment Due</h2>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Your monthly rental subscription for the PG Management Tool is pending.
                        Please pay the monthly fee to continue using the platform without interruption.
                    </p>

                    <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg mb-6 flex justify-between items-center border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-500">Amount Due</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">₹{amount}</span>
                    </div>

                    <div className="space-y-3">
                        <button
                            className="w-full py-3 bg-primary hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-500/20"
                            onClick={() => alert("Please contact the Super Admin to complete your payment.")}
                        >
                            Pay Now
                        </button>
                        <p className="text-xs text-center text-gray-400">
                            Contact Super Admin for payment details.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
