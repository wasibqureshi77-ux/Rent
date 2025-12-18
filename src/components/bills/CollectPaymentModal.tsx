'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CollectPaymentModalProps {
    billId: string;
    totalAmount: number;
    paidAmount: number;
    upiQrCode?: string; // Add optional QR code
    onClose: () => void;
}

export default function CollectPaymentModal({ billId, totalAmount, paidAmount, upiQrCode, onClose }: CollectPaymentModalProps) {
    const router = useRouter();
    const remainingDue = totalAmount - paidAmount;
    const [amount, setAmount] = useState(remainingDue);
    const [method, setMethod] = useState<'CASH' | 'UPI'>('CASH');
    const [loading, setLoading] = useState(false);
    const [isQrExpanded, setIsQrExpanded] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/bills/${billId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, method }),
            });

            if (res.ok) {
                router.refresh();
                onClose();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h2 className="font-semibold text-white">Collect Payment</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Display */}
                    <div className="text-center space-y-1">
                        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Total Payable</p>
                        <p className="text-4xl font-bold text-white">₹{totalAmount.toLocaleString()}</p>
                    </div>

                    {/* Method Selector */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950/50 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setMethod('CASH')}
                            className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${method === 'CASH'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Cash
                        </button>
                        <button
                            onClick={() => setMethod('UPI')}
                            className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${method === 'UPI'
                                ? 'bg-[#ff6d00]/10 text-[#ff6d00] border border-[#ff6d00]/20 shadow-sm'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            UPI
                        </button>
                    </div>

                    {/* QR Code Segment - Only show if UPI is selected AND qr code exists */}
                    {method === 'UPI' && upiQrCode && (
                        <div className="border border-dashed border-white/10 rounded-xl p-6 bg-zinc-950/30 flex flex-col items-center justify-center gap-4 transition-all animate-in zoom-in-95">
                            <div
                                className="bg-white p-2 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setIsQrExpanded(true)}
                                title="Click to expand"
                            >
                                <img src={upiQrCode} alt="UPI QR" className="w-40 h-40 object-contain" />
                            </div>
                            <p className="text-xs text-gray-500">Scan QR to Pay via Billing App</p>
                        </div>
                    )}

                    {/* Expanded QR Modal */}
                    {isQrExpanded && upiQrCode && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setIsQrExpanded(false)}>
                            <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => setIsQrExpanded(false)}
                                    className="absolute -top-12 right-0 md:-right-12 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                                <div className="bg-white p-4 rounded-xl shadow-2xl overflow-hidden">
                                    <img src={upiQrCode} alt="Expanded UPI QR" className="max-w-[80vw] max-h-[70vh] object-contain" />
                                </div>
                                <p className="text-white/70 mt-4 text-sm font-medium">Scan with any UPI App</p>
                            </div>
                        </div>
                    )}

                    {/* Input Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Amount Collected</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ff6d00]/50 transition-all font-mono text-lg"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-gray-500">Remaining Due:</span>
                        <span className={`font-mono font-medium ${remainingDue - amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            ₹ {(remainingDue - amount).toLocaleString()}
                        </span>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || amount <= 0}
                        className="w-full py-3.5 bg-gradient-to-r from-[#ff6d00] to-[#ff9100] hover:from-[#ff6d00] hover:to-[#ff6d00] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? 'Processing...' : `Confirm ${method} Payment`}
                    </button>
                </div>
            </div>
        </div>
    );
}
