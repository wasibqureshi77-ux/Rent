import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import MonthlyBill from '@/models/MonthlyBill';

// GET /api/dashboard/alerts - Get dashboard alerts
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

        const alerts: any[] = [];

        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const currentDay = now.getDate();

        // Alert 1: Missing bills for month-end (after 25th of month)
        if (currentDay >= 25) {
            const allActiveTenants = await Tenant.find({
                ...baseQuery,
                isActive: true
            }).select('_id fullName roomNumber');

            const billsThisMonth = await MonthlyBill.find({
                ...baseQuery,
                month: currentMonth,
                year: currentYear
            }).select('tenantId');

            const tenantIdsWithBills = new Set(
                billsThisMonth.map(b => b.tenantId.toString())
            );

            const tenantsWithoutBills = allActiveTenants.filter(
                t => !tenantIdsWithBills.has(t._id.toString())
            );

            if (tenantsWithoutBills.length > 0) {
                alerts.push({
                    type: 'MISSING_BILLS',
                    severity: 'warning',
                    title: 'Missing Bills for Month-End',
                    message: `${tenantsWithoutBills.length} tenant(s) don't have bills generated for ${currentMonth}/${currentYear}`,
                    count: tenantsWithoutBills.length,
                    data: tenantsWithoutBills.map(t => ({
                        tenantId: t._id,
                        fullName: t.fullName,
                        roomNumber: t.roomNumber
                    }))
                });
            }
        }

        // Alert 2: High due balances (> 10000 or configurable threshold)
        const highDueThreshold = 10000;
        const highDueBills = await MonthlyBill.find({
            ...baseQuery,
            'payments.remainingDue': { $gte: highDueThreshold },
            status: { $in: ['PENDING', 'PARTIAL'] }
        })
            .populate('tenantId', 'fullName roomNumber phoneNumber')
            .populate('propertyId', 'name')
            .sort({ 'payments.remainingDue': -1 });

        if (highDueBills.length > 0) {
            alerts.push({
                type: 'HIGH_DUE_BALANCE',
                severity: 'error',
                title: 'High Outstanding Balances',
                message: `${highDueBills.length} bill(s) with outstanding balance ≥ ₹${highDueThreshold}`,
                count: highDueBills.length,
                data: highDueBills.map(b => {
                    const tenant = b.tenantId as any;
                    const property = b.propertyId as any;
                    return {
                        billId: b._id,
                        tenant: {
                            _id: tenant._id,
                            fullName: tenant.fullName,
                            roomNumber: tenant.roomNumber,
                            phoneNumber: tenant.phoneNumber
                        },
                        property: property ? {
                            _id: property._id,
                            name: property.name
                        } : null,
                        month: b.month,
                        year: b.year,
                        remainingDue: b.payments?.remainingDue || 0,
                        totalAmount: b.amounts?.totalAmount || 0
                    };
                })
            });
        }

        // Alert 3: Overdue bills (from previous months)
        const overdueBills = await MonthlyBill.find({
            ...baseQuery,
            status: { $in: ['PENDING', 'PARTIAL'] },
            $or: [
                { year: { $lt: currentYear } },
                { year: currentYear, month: { $lt: currentMonth } }
            ]
        })
            .populate('tenantId', 'fullName roomNumber phoneNumber')
            .populate('propertyId', 'name')
            .sort({ year: 1, month: 1 });

        if (overdueBills.length > 0) {
            const totalOverdue = overdueBills.reduce(
                (sum, bill) => sum + (bill.payments?.remainingDue || 0),
                0
            );

            alerts.push({
                type: 'OVERDUE_BILLS',
                severity: 'error',
                title: 'Overdue Bills',
                message: `${overdueBills.length} overdue bill(s) with total outstanding of ₹${totalOverdue.toFixed(2)}`,
                count: overdueBills.length,
                totalAmount: totalOverdue,
                data: overdueBills.map(b => {
                    const tenant = b.tenantId as any;
                    const property = b.propertyId as any;
                    return {
                        billId: b._id,
                        tenant: {
                            _id: tenant._id,
                            fullName: tenant.fullName,
                            roomNumber: tenant.roomNumber,
                            phoneNumber: tenant.phoneNumber
                        },
                        property: property ? {
                            _id: property._id,
                            name: property.name
                        } : null,
                        month: b.month,
                        year: b.year,
                        remainingDue: b.payments?.remainingDue || 0,
                        daysOverdue: calculateDaysOverdue(b.month, b.year)
                    };
                })
            });
        }

        // Alert 4: Tenants with high outstanding balance
        const highOutstandingTenants = await Tenant.find({
            ...baseQuery,
            isActive: true,
            outstandingBalance: { $gte: 5000 }
        })
            .populate('propertyId', 'name')
            .sort({ outstandingBalance: -1 });

        if (highOutstandingTenants.length > 0) {
            alerts.push({
                type: 'HIGH_TENANT_BALANCE',
                severity: 'warning',
                title: 'Tenants with High Outstanding Balance',
                message: `${highOutstandingTenants.length} tenant(s) with outstanding balance ≥ ₹5000`,
                count: highOutstandingTenants.length,
                data: highOutstandingTenants.map(t => {
                    const property = t.propertyId as any;
                    return {
                        tenantId: t._id,
                        fullName: t.fullName,
                        roomNumber: t.roomNumber,
                        phoneNumber: t.phoneNumber,
                        outstandingBalance: t.outstandingBalance,
                        property: property ? {
                            _id: property._id,
                            name: property.name
                        } : null
                    };
                })
            });
        }

        return NextResponse.json({
            alerts,
            summary: {
                totalAlerts: alerts.length,
                criticalCount: alerts.filter(a => a.severity === 'error').length,
                warningCount: alerts.filter(a => a.severity === 'warning').length
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard alerts:', error);
        return NextResponse.json({
            message: 'Error fetching dashboard alerts'
        }, { status: 500 });
    }
}

function calculateDaysOverdue(month: number, year: number): number {
    const billDate = new Date(year, month - 1, 1); // First day of bill month
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - billDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
