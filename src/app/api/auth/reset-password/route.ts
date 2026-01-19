import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ message: 'Token and password are required' }, { status: 400 });
        }

        await connectDB();

        console.log('--- RESET PASSWORD ATTEMPT ---');
        console.log('Token received:', token);

        const user = await User.findOne({
            resetPasswordToken: token
        });

        if (!user) {
            console.log('FAILED: No user found with token:', token);
            // Let's see if we can find them by something else to check if the token even exists in DB
            const anyUserWithToken = await User.findOne({ resetPasswordToken: { $exists: true } });
            console.log('Debug: Any user with ANY token exists?', !!anyUserWithToken);
            return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
        }

        const now = new Date();
        if (!user.resetPasswordExpires || user.resetPasswordExpires < now) {
            console.log('FAILED: Token has expired');
            console.log('Expires at:', user.resetPasswordExpires);
            console.log('Current time:', now);
            return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
        }

        console.log('SUCCESS: User found and token valid:', user.email);

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return NextResponse.json({ message: 'Password has been reset successfully' });

    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
