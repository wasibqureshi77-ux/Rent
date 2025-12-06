import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Bill from '@/models/Bill';

// This endpoint should be secured by a secret key in production headers
export async function GET(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (key !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        // Allow unauthenticated in dev or if secret matches
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        // Logic to calculate monthly summary for all owners
        const owners = await User.find({ role: { $in: ['super_admin', 'owner'] } });

        // In a real app, we would use a library like 'nodemailer' to send emails.
        // For this demo, we will log the summaries to the console (simulating email sending).

        const results = [];

        for (const owner of owners) {
            // Calculate total rent due vs received for current month?
            // Let's assume current month.
            const date = new Date();
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const bills = await Bill.find({ ownerId: owner._id, month: monthStr });
            const totalAmount = bills.reduce((acc, b) => acc + b.totalAmount, 0);
            const paidAmount = bills.reduce((acc, b) => acc + b.paidAmount, 0);
            const pendingAmount = totalAmount - paidAmount;

            const summary = `
        Dear ${owner.name},
        
        Here is your PG Management Summary for ${monthStr}:
        Total Billed: ₹${totalAmount}
        Total Collected: ₹${paidAmount}
        Pending: ₹${pendingAmount}
        
        Login to dashboard for details.
        `;

            console.log(`[EMAIL SIMULATOR] Sending email to ${owner.email}:\n${summary}`);
            results.push({ email: owner.email, status: 'sent', summary });
        }

        return NextResponse.json({ message: 'Summaries processed', results });

    } catch (error: any) {
        return NextResponse.json({ message: 'Error processing summary' }, { status: 500 });
    }
}
