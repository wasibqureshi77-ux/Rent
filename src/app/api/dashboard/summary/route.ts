import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import MonthlyBill from '@/models/MonthlyBill';
import Property from '@/models/Property';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/summary - Get dashboard summary for owner
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get('propertyId');

        // Determine owner ID for queries
        const ownerId = session.user.role === 'SUPER_ADMIN' && searchParams.get('ownerId')
            ? searchParams.get('ownerId')
            : session.user.id;

        // Build base query
        const baseQuery: any = session.user.role === 'SUPER_ADMIN' && !ownerId
            ? {}
            : { ownerId };

        if (propertyId) {
            baseQuery.propertyId = propertyId;
        }

        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // 1. Count active tenants
        const activeTenants = await Tenant.countDocuments({
            ...baseQuery,
            isActive: true
        });

        // 2. Count bills created this month
        const billsThisMonth = await MonthlyBill.countDocuments({
            ...baseQuery,
            month: currentMonth,
            year: currentYear
        });

        // 3. Get tenants without bills this month
        const allActiveTenants = await Tenant.find({
            ...baseQuery,
            isActive: true
        }).select('_id fullName roomNumber propertyId startDate');

        const billsThisMonthData = await MonthlyBill.find({
            ...baseQuery,
            month: currentMonth,
            year: currentYear
        }).select('tenantId');

        const tenantIdsWithBills = new Set(
            billsThisMonthData.map(b => b.tenantId.toString())
        );

        const tenantsWithoutBills = allActiveTenants.filter(
            t => !tenantIdsWithBills.has(t._id.toString())
        );

        // 4. Calculate total outstanding due
        const outstandingBills = await MonthlyBill.aggregate([
            {
                $match: {
                    ...baseQuery,
                    status: { $in: ['PENDING', 'PARTIAL'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOutstanding: { $sum: '$payments.remainingDue' }
                }
            }
        ]);

        const totalOutstandingDue = outstandingBills.length > 0
            ? outstandingBills[0].totalOutstanding
            : 0;

        // 5. Get property count (if not filtered by property)
        const propertyCount = !propertyId
            ? await Property.countDocuments({ ...baseQuery, isActive: true })
            : 1;

        // 6. Get recent bills
        const recentBills = await MonthlyBill.find(baseQuery)
            .populate('tenantId', 'fullName roomNumber')
            .populate('propertyId', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        // 7. Payment and Electricity statistics for current month
        const monthlyStats = await MonthlyBill.aggregate([
            {
                $match: {
                    ...baseQuery,
                    month: currentMonth,
                    year: currentYear
                }
            },
            {
                $group: {
                    _id: null,
                    rentRevenue: { $sum: { $add: ['$amounts.rentAmount', '$amounts.waterCharge'] } },
                    totalCollected: { $sum: '$payments.amountPaid' },
                    electricityUsage: { $sum: '$meter.unitsConsumed' }
                }
            }
        ]);

        const currentMonthStats = monthlyStats.length > 0 ? monthlyStats[0] : { rentRevenue: 0, totalCollected: 0, electricityUsage: 0 };

        // 8. Get top pending payments (high outstanding first)
        const pendingPayments = await MonthlyBill.find({
            ...baseQuery,
            status: { $in: ['PENDING', 'PARTIAL'] },
            'payments.remainingDue': { $gt: 0 }
        })
            .populate('tenantId', 'fullName roomNumber')
            .populate('propertyId', 'name')
            .sort({ 'payments.remainingDue': -1 })
            .limit(5);

        // 9. Calculate Total Occupancy Months
        const nowMs = now.getTime();
        const totalOccupancyMonths = allActiveTenants.reduce((sum, tenant) => {
            // startDate is selected above. If missing, assume recent? No, schema has default now.
            // Accessing tenant.startDate might need type assertion if TS complains, but mongoose document usually works.
            // However, tenantsWithoutBills uses the same array.
            const start = new Date(tenant.startDate || now).getTime(); // Fallback to now if missing
            const diff = Math.max(0, nowMs - start);
            // Approximate month in ms: 30.44 * 24 * 60 * 60 * 1000 = 2629987200
            const months = diff / 2629987200;
            return sum + months;
        }, 0);

        return NextResponse.json({
            summary: {
                activeTenants,
                propertyCount,
                billsThisMonth,
                tenantsWithoutBills: tenantsWithoutBills.length,
                totalOutstandingDue,
                currentMonth,
                currentYear,
                totalRevenue: currentMonthStats.rentRevenue, // Revenue = Rent + Water (Billed)
                totalBilled: currentMonthStats.rentRevenue, // Keeping consistent
                electricityUsage: currentMonthStats.electricityUsage,
                totalOccupancyMonths: Math.round(totalOccupancyMonths)
            },
            tenantsWithoutBills: tenantsWithoutBills.map(t => ({
                _id: t._id,
                fullName: t.fullName,
                roomNumber: t.roomNumber,
                propertyId: t.propertyId
            })),
            pendingPayments,
            recentBills
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        return NextResponse.json({
            message: 'Error fetching dashboard summary'
        }, { status: 500 });
    }
}
