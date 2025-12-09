import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    runMonthlyBillingSummary,
    sendMonthlyBillingSummaryEmail,
    runMonthlyBillingForAllOwners,
    generateGlobalSummary
} from '@/lib/billing-summary';

// POST /api/billing/monthly-summary - Generate and send monthly summary
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { month, year, sendToAll } = body;

        // Validate month and year
        if (!month || !year || month < 1 || month > 12) {
            return NextResponse.json({
                message: 'Invalid month or year'
            }, { status: 400 });
        }

        // Super admin can send to all owners
        if (sendToAll && session.user.role === 'SUPER_ADMIN') {
            const results = await runMonthlyBillingForAllOwners(month, year);

            return NextResponse.json({
                message: 'Monthly summaries sent to all property owners',
                results,
                successCount: results.filter(r => r.success).length,
                failureCount: results.filter(r => !r.success).length
            });
        }

        // Generate summary for current owner
        const summary = await runMonthlyBillingSummary(
            session.user.id,
            month,
            year
        );

        // Send email
        await sendMonthlyBillingSummaryEmail(summary);

        return NextResponse.json({
            message: 'Monthly summary generated and sent successfully',
            summary
        });
    } catch (error: any) {
        console.error('Error generating monthly summary:', error);
        return NextResponse.json({
            message: error.message || 'Error generating monthly summary'
        }, { status: 500 });
    }
}

// GET /api/billing/monthly-summary - Get monthly summary without sending email
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const month = parseInt(searchParams.get('month') || '');
        const year = parseInt(searchParams.get('year') || '');
        const global = searchParams.get('global') === 'true';

        // Validate month and year
        if (!month || !year || month < 1 || month > 12) {
            return NextResponse.json({
                message: 'Invalid month or year'
            }, { status: 400 });
        }

        // Super admin can get global summary
        if (global && session.user.role === 'SUPER_ADMIN') {
            const globalSummary = await generateGlobalSummary(month, year);
            return NextResponse.json({
                type: 'global',
                month,
                year,
                owners: globalSummary
            });
        }

        // Generate summary for current owner
        const summary = await runMonthlyBillingSummary(
            session.user.id,
            month,
            year
        );

        return NextResponse.json(summary);
    } catch (error: any) {
        console.error('Error fetching monthly summary:', error);
        return NextResponse.json({
            message: error.message || 'Error fetching monthly summary'
        }, { status: 500 });
    }
}
