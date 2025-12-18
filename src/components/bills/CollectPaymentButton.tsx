'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import CollectPaymentModal from './CollectPaymentModal';

interface CollectPaymentButtonProps {
    billId: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    upiQrCode?: string;
}

export default function CollectPaymentButton({ billId, totalAmount, paidAmount, status, upiQrCode }: CollectPaymentButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (status === 'PAID') return null;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg shadow-md transition-all animate-pulse hover:animate-none"
            >
                <CreditCard className="h-4 w-4" />
                Collect Payment
            </button>

            {isModalOpen && (
                <CollectPaymentModal
                    billId={billId}
                    totalAmount={totalAmount}
                    paidAmount={paidAmount}
                    upiQrCode={upiQrCode}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
}
