import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';
import User from '@/models/User';
import PrintButton from '@/components/common/PrintButton';
import BillActions from '@/components/bills/BillActions';
import CollectPaymentButton from '@/components/bills/CollectPaymentButton';

// Ensure models are registered
import '@/models/Tenant';
import '@/models/Property';

export const dynamic = 'force-dynamic';

export default async function BillDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    await connectDB();
    const bill = await MonthlyBill.findById(id)
        .populate('tenantId', 'fullName roomNumber')
        .populate('propertyId', 'name address ownerId')
        .lean();

    if (!bill) {
        notFound();
    }

    const getMonthName = (month: number) => {
        const date = new Date();
        date.setMonth(month - 1);
        return date.toLocaleString('default', { month: 'long' });
    };

    const formatCurrency = (amount: number) => amount.toLocaleString();

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-GB');
    };

    const b: any = bill;
    const rawProp = b.propertyId;
    const propId = (rawProp && typeof rawProp === 'object' && '_id' in rawProp)
        ? String(rawProp._id)
        : String(rawProp);

    let upiQrCode: string | undefined = undefined;

    if (propId) {
        try {
            const { default: Property } = await import('@/models/Property');
            const property = await Property.findById(propId).lean();

            if (property && (property as any).ownerId) {
                const owner = await User.findById((property as any).ownerId).lean();
                if (owner && (owner as any).settings && (owner as any).settings.upiQrCode) {
                    const code = (owner as any).settings.upiQrCode;
                    if (typeof code === 'string' && code.startsWith('http')) {
                        upiQrCode = code;
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching QR code:', err);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 print:p-0 print:max-w-none">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/bills" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Bill Details</h1>
                </div>
                <div className="flex items-center gap-3">
                    <CollectPaymentButton
                        billId={id}
                        totalAmount={b.amounts?.totalAmount || 0}
                        paidAmount={b.amounts?.paidAmount || 0}
                        status={b.status}
                        upiQrCode={upiQrCode}
                    />
                    <PrintButton />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm print:border-none print:shadow-none print:p-0">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {b.propertyId?.name || 'Property Management'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {b.propertyId?.address || ''}
                        </p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-semibold text-primary">INVOICE</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                            {getMonthName(b.month)} {b.year}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Generated: {formatDate(b.createdAt)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{b.tenantId?.fullName || 'Unknown Tenant'}</p>
                        <p className="text-gray-600 dark:text-gray-300">Room: {b.tenantId?.roomNumber || 'N/A'}</p>
                    </div>
                    <div className="text-right flex justify-end items-start gap-4">
                        <div className="print:hidden">
                            <BillActions billId={id} currentStatus={b.status} />
                        </div>
                        <div className={`hidden print:inline-block px-4 py-2 rounded-lg font-bold border-2 ${b.status === 'PAID' ? 'border-green-500 text-green-600 bg-green-50' :
                            b.status === 'PARTIAL' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                                'border-red-500 text-red-600 bg-red-50'
                            }`}>
                            {b.status}
                        </div>
                    </div>
                </div>

                <div className="mb-8 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Electricity Meter Reading</h4>

                    {b.roomDetails && b.roomDetails.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-zinc-800">
                                    <tr>
                                        <th className="px-3 py-2">Room</th>
                                        <th className="px-3 py-2 text-right">Rent</th>
                                        <th className="px-3 py-2 text-center">Prev</th>
                                        <th className="px-3 py-2 text-center">Curr</th>
                                        <th className="px-3 py-2 text-right">Usage</th>
                                        <th className="px-3 py-2 text-right">Amt (Est)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {b.roomDetails.map((room: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 font-medium">{room.roomNumber}</td>
                                            <td className="px-3 py-2 text-right">₹{room.rentAmount}</td>
                                            <td className="px-3 py-2 text-center">{room.meter?.startUnits}</td>
                                            <td className="px-3 py-2 text-center">{room.meter?.endUnits}</td>
                                            <td className="px-3 py-2 text-right">{room.meter?.unitsConsumed}</td>
                                            <td className="px-3 py-2 text-right">
                                                ₹{((room.meter?.unitsConsumed || 0) * (b.amounts?.ratePerUnit || 0)).toFixed(0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t border-gray-300 dark:border-gray-600 font-semibold">
                                    <tr>
                                        <td className="px-3 py-2">Total</td>
                                        <td className="px-3 py-2 text-right">₹{b.amounts?.rentAmount}</td>
                                        <td colSpan={2}></td>
                                        <td className="px-3 py-2 text-right">{b.meter?.unitsConsumed}</td>
                                        <td className="px-3 py-2 text-right">₹{b.amounts?.electricityAmount}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Previous</p>
                                <p className="font-mono font-medium text-lg">{b.meter?.startUnits ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Current</p>
                                <p className="font-mono font-medium text-lg">{b.meter?.endUnits ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Consumed</p>
                                <p className="font-mono font-bold text-lg text-primary">{b.meter?.unitsConsumed ?? 0} Units</p>
                            </div>
                        </div>
                    )}
                </div>

                <table className="w-full mb-8">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left py-2 font-semibold text-gray-600">Description</th>
                            <th className="text-right py-2 font-semibold text-gray-600">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                            <td className="py-3 text-gray-800 dark:text-gray-300">Room Rent</td>
                            <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(b.amounts?.rentAmount ?? 0)}
                            </td>
                        </tr>
                        <tr>
                            <td className="py-3 text-gray-800 dark:text-gray-300">
                                Electricity Charges ({b.meter?.unitsConsumed ?? 0} units @ ₹{b.amounts?.ratePerUnit ?? 0}/unit)
                            </td>
                            <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(b.amounts?.electricityAmount ?? 0)}
                            </td>
                        </tr>
                        <tr>
                            <td className="py-3 text-gray-800 dark:text-gray-300">Water Charges</td>
                            <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(b.amounts?.waterCharge ?? 0)}
                            </td>
                        </tr>
                        {b.amounts?.previousDue > 0 && (
                            <tr>
                                <td className="py-3 text-red-600">Previous Dues</td>
                                <td className="py-3 text-right font-medium text-red-600">
                                    {formatCurrency(b.amounts?.previousDue)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            <td className="py-4 font-bold text-lg text-gray-900 dark:text-white">Total Amount</td>
                            <td className="py-4 text-right font-bold text-2xl text-primary">
                                ₹ {formatCurrency(b.amounts?.totalAmount ?? 0)}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="text-center text-sm text-gray-500 mt-12 print:mt-20">
                    <p>Thank you for your business!</p>
                </div>
            </div>
        </div>
    );
}
