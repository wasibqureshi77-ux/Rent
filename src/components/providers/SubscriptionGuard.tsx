'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [showPopup, setShowPopup] = useState(false);
    const [amount, setAmount] = useState(0);
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // Load Razorpay Script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        const checkSubscription = async () => {
            // Only check for Property Owners in dashboard routes
            if (!session || !pathname?.startsWith('/dashboard')) return;
            if (session.user.role === 'SUPER_ADMIN') {
                setShowPopup(false);
                return;
            }

            try {
                const subRes = await fetch('/api/subscription/status');
                if (subRes.ok) {
                    const data = await subRes.json();
                    if (data.isOverdue) {
                        setAmount(data.fee);
                        setRazorpayKeyId(data.razorpayKeyId);
                        setShowPopup(true);
                    } else {
                        setShowPopup(false);
                    }
                }
            } catch (err) {
                console.error('Subscription check failed:', err);
            }
        };

        checkSubscription();

        // Check every 5 minutes to see if admin cleared status
        const interval = setInterval(checkSubscription, 5 * 60 * 1000);
        return () => {
            clearInterval(interval);
            document.body.removeChild(script);
        };
    }, [session, pathname]);

    const handlePayment = async () => {
        if (!razorpayKeyId) {
            alert("Payment gateway not configured. Please contact support.");
            return;
        }

        setLoading(true);
        try {
            // 1. Create Order
            const orderRes = await fetch('/api/subscription/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const order = await orderRes.json();

            // 2. Open Razorpay
            const options = {
                key: razorpayKeyId,
                amount: order.amount,
                currency: order.currency,
                name: "PG Management System",
                description: "Monthly Platform Subscription",
                order_id: order.id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    const verifyRes = await fetch('/api/subscription/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...response,
                            amount
                        })
                    });

                    if (verifyRes.ok) {
                        window.location.reload(); // Reload to clear the guard
                    } else {
                        alert("Payment verification failed. Please contact administrator.");
                    }
                },
                prefill: {
                    name: session?.user?.name,
                    email: session?.user?.email,
                },
                theme: {
                    color: "#f97316", // Primary orange
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error(error);
            alert("Payment initialization failed.");
        } finally {
            setLoading(false);
        }
    };

    // If it's a non-dashboard page or not overdue, just show children
    if (!showPopup) return <>{children}</>;

    return (
        <>
            <div className="blur-sm pointer-events-none select-none">
                {children}
            </div>

            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border-2 border-orange-500/50 animate-in zoom-in-95 duration-500">
                    <div className="p-10 text-center relative">
                        <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                            <AlertTriangle className="w-12 h-12 text-orange-500" />
                        </div>

                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                            Access Restricted
                        </h2>

                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                            Your monthly subscription has <span className="text-orange-500 font-bold underline">Expired</span>. Please clear the pending charges to unlock your dashboard.
                        </p>

                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl mb-8 flex justify-between items-center border border-gray-100 dark:border-zinc-800">
                            <div className="text-left">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Charge</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Platform Maintenance Fee</p>
                            </div>
                            <span className="text-3xl font-black text-gray-900 dark:text-white">₹{amount}</span>
                        </div>

                        <div className="space-y-4">
                            <button
                                className="w-full py-4 bg-primary hover:bg-orange-600 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                                onClick={handlePayment}
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Initializing...
                                    </div>
                                ) : (
                                    <>
                                        <CreditCard className="w-6 h-6" />
                                        PAY NOW TO UNLOCK
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-gray-400 font-medium">
                                Account will be automatically unlocked after payment verification.
                            </p>
                        </div>
                    </div>

                    <div className="bg-zinc-950 px-8 py-4 text-center border-t border-white/5">
                        <p className="text-[10px] text-orange-500 font-bold tracking-[0.2em] uppercase">
                            System Security Lock Active
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
