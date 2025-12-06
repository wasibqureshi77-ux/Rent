import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { z } from 'zod';

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

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: isFirstUser ? 'super_admin' : 'owner',
            isVerified: isFirstUser, // First user verification logic handled here or manually? 
            // Spec says "Email verified". We will set isVerified to true for first user for ease.
            // For others, we might need an email verification flow (out of scope for quick start unless asked, but I'll set false).
            isApproved: isFirstUser,
            settings: {
                currency: 'INR'
            }
        });

        return NextResponse.json({
            message: 'User created successfully',
            userId: user._id
        }, { status: 201 });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
