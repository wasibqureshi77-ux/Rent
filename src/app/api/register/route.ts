import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { z } from 'zod';
import { generateVerificationToken, getVerificationTokenExpiry, sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password } = registerSchema.parse(body);

        await connectDB();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the first user (make them super_admin and auto-approve)
        const count = await User.countDocuments();
        const isFirstUser = count === 0;

        let verificationToken = null;
        let verificationTokenExpiry = null;

        // Generate verification token for non-super_admin users
        if (!isFirstUser) {
            verificationToken = generateVerificationToken();
            verificationTokenExpiry = getVerificationTokenExpiry();

            // Send verification email
            await sendVerificationEmail(email, verificationToken, name);
        }

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: isFirstUser ? 'super_admin' : 'owner',
            isVerified: isFirstUser,
            isApproved: isFirstUser,
            verificationToken: isFirstUser ? undefined : verificationToken,
            verificationTokenExpiry: isFirstUser ? undefined : verificationTokenExpiry,
            settings: {
                currency: 'INR'
            }
        });

        const message = isFirstUser
            ? 'Super admin account created successfully. You can now login.'
            : 'Registration successful! Please check your email to verify your account.';

        return NextResponse.json({
            message,
            userId: user._id,
            requiresVerification: !isFirstUser
        }, { status: 201 });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
