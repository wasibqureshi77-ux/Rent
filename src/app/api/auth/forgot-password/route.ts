import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

        await connectDB();

        // Case-insensitive search
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        if (!user) {
            // We return 200 even if user not found for security reasons (vulnerability: account enumeration)
            return NextResponse.json({
                message: 'If an account exists with this email, you will receive a reset link shortly.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

        // Update user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetPasswordExpires;
        await user.save();

        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        console.log('--- PASSWORD RESET DEBUG ---');
        console.log('Email:', email);
        console.log('Token:', resetToken);
        console.log('Reset URL:', resetUrl);
        console.log('-----------------------------');

        // Send email
        await sendPasswordResetEmail(email, resetToken, user.name);

        return NextResponse.json({
            message: 'If an account exists with this email, you will receive a reset link shortly.'
        });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
