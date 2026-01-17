import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { z } from 'zod';
import { generateVerificationToken, getVerificationTokenExpiry, sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    phone: z.string().min(10, 'Mobile number is required'),
    propertyName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = registerSchema.parse(body);
        const { name, email, password, phone, propertyName } = validatedData;

        await connectDB();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'Email already in use' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the first user (make them SUPER_ADMIN)
        const count = await User.countDocuments();
        const isFirstUser = count === 0;

        let verificationToken = null;
        let verificationTokenExpiry = null;

        // Generate verification token for property owners
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
            phone,
            propertyName,
            role: isFirstUser ? 'SUPER_ADMIN' : 'PROPERTY_OWNER',
            status: isFirstUser ? 'ACTIVE' : 'PENDING_EMAIL_VERIFICATION',
            emailVerifiedAt: isFirstUser ? new Date() : undefined,
            verificationToken: isFirstUser ? undefined : verificationToken,
            verificationTokenExpiry: isFirstUser ? undefined : verificationTokenExpiry,
            themePreference: 'system',
            settings: {
                currency: 'INR'
            },
            subscription: {
                status: isFirstUser ? 'ACTIVE' : 'ACTIVE', // Initial active for trial
                nextBillingDate: isFirstUser ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 day trial
                planAmount: 0
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
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                message: error.issues[0].message
            }, { status: 400 });
        }
        console.error('Registration error:', error);
        return NextResponse.json({
            message: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
