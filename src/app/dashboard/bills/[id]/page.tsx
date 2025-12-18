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

    // Fetch the property owner to get the UPI QR Code
    // Assuming propertyId has an ownerId or we can find the owner via property association
    // In our schema, Property has `userId`? Let's check.
    // Actually, checking standard schema: Property usually has `owner` or `userId`.
    // Let's assume Property model has `userId` which refers to the User (Owner).
    // Let's populate the owner from property if possible, or just fetch separate.
    // Wait, typical schema: property -> user (via userId). 
    // bill.propertyId is populated with name/address. Let's fetch full property to get user ID?
    // Optimization: Access `bill.propertyId._id` -> find Property -> get user.
    // But `bill.propertyId` is already an object here. If `userId` was not selected in populate, we miss it.
    // Let's update the populate above.

    const propertyOwner = await User.findOne({ _id: (bill as any).propertyId?.userId || (bill as any).userId });
    // Wait, bill usually has propertyId. Property has userId. 
    // Let's re-fetch or assume logic.
    // Actually, MonthlyBill doesn't have owner directly. 
    // Let's rely on the property relation.
    // We need to know the schema of Property. 

    // For now, let's try to fetch the User assuming the logged in user is the owner (dashboard view) OR
    // we fetch the owner of the property associated with the bill.
    // To be safe, let's fetch the property's owner.

    // Simplification: We need the UPI QR of the *Property Owner*.
    // If the Property schema has `owner` or `userId`:
    // We already populated propertyId. Let's add 'userId' to the selection.

    // NOTE: I cannot change the populate line in this replacement cleanly without reading the whole file or being precise. 
    // I will replace the imports and the data fetching start.

    if (!bill) {
        notFound();
    }

    const getMonthName = (month: number) => {
        const date = new Date();
        date.setMonth(month - 1);
        return date.toLocaleString('default', { month: 'long' });
    };

    // Helper to format currency
    const formatCurrency = (amount: number) => amount.toLocaleString();

    // Helper to simple date for display
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-GB');
    };

    // Because 'bill' is a plain object from lean(), we can access properties.
    const b: any = bill;

    // Fetch property owner to ensure we satisfy any schema (using propertyId.owner or propertyId.userId commonly)
    // We already added 'ownerId' to populate in previous step, but let's be robust.
    // If we didn't populate 'userId' specifically, we might miss it.
    // Let's assume standard Property schema uses 'userId' for the owner.
    // We need to re-fetch the user details safely.
    // Robustly determine Property ID (handle populate vs non-populate)
    const rawProp = b.propertyId;
    const propId = (rawProp && typeof rawProp === 'object' && '_id' in rawProp)
        ? rawProp._id
        : rawProp;

    let upiQrCode: string | undefined = undefined;

    if (propId) {
        try {
            const { default: Property } = await import('@/models/Property');
            const property = await Property.findById(propId).lean();

            if (property && property.ownerId) {
                const owner = await User.findById(property.ownerId).lean();
                if (owner && owner.settings && owner.settings.upiQrCode) {
                    const code = owner.settings.upiQrCode;
                    // Ensure it is a valid URL to avoid "undefined" string issues
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
            {/* ... existing header ... */}
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

            {/* Bill Content - Printable Area */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm print:border-none print:shadow-none print:p-0">
                {/* ... existing content ... */}
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

                {/* Tenant Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</p>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{b.tenantId?.fullName || 'Unknown Tenant'}</p>
                        <p className="text-gray-600 dark:text-gray-300">Room: {b.tenantId?.roomNumber || 'N/A'}</p>
                    </div>
                    <div className="text-right flex justify-end items-start gap-4">
                        {/* Interactive Actions (Hidden in Print) */}
                        <div className="print:hidden">
                            <BillActions billId={id} currentStatus={b.status} />
                        </div>

                        {/* Static Badge (Visible ONLY in Print) */}
                        <div className={`hidden print:inline-block px-4 py-2 rounded-lg font-bold border-2 ${b.status === 'PAID' ? 'border-green-500 text-green-600 bg-green-50' :
                            b.status === 'PARTIAL' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                                'border-red-500 text-red-600 bg-red-50'
                            }`}>
                            {b.status}
                        </div>
                    </div>
                </div>

                {/* Meter Readings */}
                <div className="mb-8 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Electricity Meter Reading</h4>
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
                </div>

                {/* Charges Breakdown */}
                <table className="w-full mb-8">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left py-2 font-semibold text-gray-600">Description</th>
                            <th className="text-right py-2 font-semibold text-gray-600">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                            <td className="py-3 text-gray-800 dark:text-gray-300">
                                Room Rent
                            </td>
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
                            <td className="py-3 text-gray-800 dark:text-gray-300">
                                Water Charges
                            </td>
                            <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                                {formatCurrency(b.amounts?.waterCharge ?? 0)}
                            </td>
                        </tr>
                        {b.amounts?.previousDue > 0 && (
                            <tr>
                                <td className="py-3 text-red-600">
                                    Previous Dues
                                </td>
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

                {/* Footer Message */}
                <div className="text-center text-sm text-gray-500 mt-12 print:mt-20">
                    <p>Thank you for your business!</p>
                </div>
            </div>

            {/* DEBUG INFO - Temporary */}
            <div className="print:hidden p-4 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-mono break-all opacity-75 hover:opacity-100 transition-opacity">
                <p className="font-bold text-red-500 mb-2">DEBUG INFO (Visible to Admin):</p>
                <p>Bill ID: {id}</p>
                <p>Property ID: {propId}</p>
                <p>Property Owner ID: {b.propertyId?.ownerId || 'Not found'}</p>
                <p>QR Code URL Found: {upiQrCode ? 'YES' : 'NO'}</p>
                {upiQrCode && <p>URL: {upiQrCode}</p>}
                {!upiQrCode && <p className="text-orange-500">Warning: No QR code found for this Property Owner.</p>}
            </div>
        </div>
    );
}
