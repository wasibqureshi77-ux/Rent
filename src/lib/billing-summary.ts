import connectDB from '@/lib/db';
import User from '@/models/User';
import Tenant from '@/models/Tenant';
import MonthlyBill from '@/models/MonthlyBill';
import Settings from '@/models/Settings';

interface BillingSummary {
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    month: number;
    year: number;
    totalTenants: number;
    billsGenerated: number;
    tenantsWithoutBills: Array<{
        fullName: string;
        roomNumber: string;
        propertyName?: string;
    }>;
    totalOutstanding: number;
    tenantDues: Array<{
        fullName: string;
        roomNumber: string;
        propertyName?: string;
        totalDue: number;
        status: string;
    }>;
    totalRevenue: number;
    totalCollected: number;
}

/**
 * Generate monthly billing summary for a specific owner
 */
export async function runMonthlyBillingSummary(
    ownerId: string,
    month: number,
    year: number
): Promise<BillingSummary> {
    await connectDB();

    // Fetch owner details
    const owner = await User.findById(ownerId);
    if (!owner) {
        throw new Error('Owner not found');
    }

    // Fetch owner settings for email
    const settings = await Settings.findOne({ ownerId });
    const ownerEmail = settings?.ownerEmail || owner.email;

    // Get all active tenants for this owner
    const allTenants = await Tenant.find({
        ownerId,
        isActive: true
    }).populate('propertyId', 'name');

    const totalTenants = allTenants.length;

    // Get bills for this month/year
    const bills = await MonthlyBill.find({
        ownerId,
        month,
        year
    }).populate('tenantId', 'fullName roomNumber')
        .populate('propertyId', 'name');

    const billsGenerated = bills.length;

    // Find tenants without bills
    const tenantIdsWithBills = new Set(bills.map(b => {
        const tenant = b.tenantId as any;
        return tenant._id.toString();
    }));

    const tenantsWithoutBills = allTenants
        .filter(t => !tenantIdsWithBills.has(t._id.toString()))
        .map(t => {
            const property = t.propertyId as any;
            return {
                fullName: t.fullName,
                roomNumber: t.roomNumber,
                propertyName: property?.name
            };
        });

    // Calculate totals
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    const tenantDues = bills
        .filter(b => (b.payments?.remainingDue || 0) > 0)
        .map(b => {
            totalRevenue += (b.amounts?.totalAmount || 0);
            totalCollected += (b.payments?.amountPaid || 0);
            totalOutstanding += (b.payments?.remainingDue || 0);

            const tenant = b.tenantId as any;
            const property = b.propertyId as any;

            return {
                fullName: tenant.fullName,
                roomNumber: tenant.roomNumber,
                propertyName: property?.name,
                totalDue: b.payments?.remainingDue || 0,
                status: b.status
            };
        })
        .sort((a, b) => b.totalDue - a.totalDue);

    // Add fully paid bills to revenue/collected
    bills.filter(b => b.status === 'PAID').forEach(b => {
        totalRevenue += (b.amounts?.totalAmount || 0);
        totalCollected += (b.payments?.amountPaid || 0);
    });

    return {
        ownerId,
        ownerName: owner.name,
        ownerEmail,
        month,
        year,
        totalTenants,
        billsGenerated,
        tenantsWithoutBills,
        totalOutstanding,
        tenantDues,
        totalRevenue,
        totalCollected
    };
}

/**
 * Send monthly billing summary email
 */
export async function sendMonthlyBillingSummaryEmail(summary: BillingSummary) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthName = monthNames[summary.month - 1];

    console.log('='.repeat(80));
    console.log(`MONTHLY BILLING SUMMARY - ${monthName} ${summary.year}`);
    console.log('='.repeat(80));
    console.log(`To: ${summary.ownerEmail}`);
    console.log(`Owner: ${summary.ownerName}`);
    console.log('');
    console.log('SUMMARY:');
    console.log(`  Total Active Tenants: ${summary.totalTenants}`);
    console.log(`  Bills Generated: ${summary.billsGenerated}`);
    console.log(`  Tenants Without Bills: ${summary.tenantsWithoutBills.length}`);
    console.log('');
    console.log('FINANCIALS:');
    console.log(`  Total Revenue: ₹${summary.totalRevenue.toFixed(2)}`);
    console.log(`  Total Collected: ₹${summary.totalCollected.toFixed(2)}`);
    console.log(`  Total Outstanding: ₹${summary.totalOutstanding.toFixed(2)}`);
    console.log('');

    if (summary.tenantsWithoutBills.length > 0) {
        console.log('TENANTS WITHOUT BILLS:');
        summary.tenantsWithoutBills.forEach(t => {
            console.log(`  - ${t.fullName} (Room ${t.roomNumber})${t.propertyName ? ` - ${t.propertyName}` : ''}`);
        });
        console.log('');
    }

    if (summary.tenantDues.length > 0) {
        console.log('OUTSTANDING DUES:');
        summary.tenantDues.forEach(t => {
            console.log(`  - ${t.fullName} (Room ${t.roomNumber}): ₹${t.totalDue.toFixed(2)} [${t.status}]${t.propertyName ? ` - ${t.propertyName}` : ''}`);
        });
        console.log('');
    }

    console.log('='.repeat(80));

    // TODO: Replace with actual email service
    // Example with Resend:
    // await resend.emails.send({
    //     from: 'billing@yourdomain.com',
    //     to: summary.ownerEmail,
    //     subject: `Monthly Billing Summary - ${monthName} ${summary.year}`,
    //     html: generateEmailHTML(summary)
    // });

    return true;
}

/**
 * Run monthly billing for all active property owners
 */
export async function runMonthlyBillingForAllOwners(month: number, year: number) {
    await connectDB();

    // Get all active property owners
    const owners = await User.find({
        role: 'PROPERTY_OWNER',
        status: 'ACTIVE'
    });

    console.log(`Running monthly billing summary for ${owners.length} property owners...`);

    const results = [];

    for (const owner of owners) {
        try {
            const summary = await runMonthlyBillingSummary(owner._id.toString(), month, year);
            await sendMonthlyBillingSummaryEmail(summary);
            results.push({ ownerId: owner._id, success: true });
        } catch (error: any) {
            console.error(`Error processing owner ${owner._id}:`, error.message);
            results.push({ ownerId: owner._id, success: false, error: error.message });
        }
    }

    return results;
}

/**
 * Generate global summary for SUPER_ADMIN
 */
export async function generateGlobalSummary(month: number, year: number) {
    await connectDB();

    const allBills = await MonthlyBill.find({ month, year })
        .populate('ownerId', 'name email');

    const ownerSummaries = new Map();

    allBills.forEach(bill => {
        const owner = bill.ownerId as any;
        const ownerId = owner._id.toString();
        if (!ownerSummaries.has(ownerId)) {
            ownerSummaries.set(ownerId, {
                ownerName: owner.name,
                ownerEmail: owner.email,
                billCount: 0,
                totalRevenue: 0,
                totalCollected: 0,
                totalOutstanding: 0
            });
        }

        const summary = ownerSummaries.get(ownerId);
        summary.billCount++;
        summary.totalRevenue += (bill.amounts?.totalAmount || 0);
        summary.totalCollected += (bill.payments?.amountPaid || 0);
        summary.totalOutstanding += (bill.payments?.remainingDue || 0);
    });

    return Array.from(ownerSummaries.values());
}
