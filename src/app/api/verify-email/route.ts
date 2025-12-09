import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ message: 'Verification token is required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return NextResponse.json({
                message: 'Invalid or expired verification token'
            }, { status: 400 });
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();

        return NextResponse.json({
            message: 'Email verified successfully! Your account is pending admin approval.',
            success: true
        });

    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.json({
            message: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
