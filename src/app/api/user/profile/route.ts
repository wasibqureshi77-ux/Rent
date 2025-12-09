import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET /api/user/profile
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();

        const user = await User.findById(session.user.id).select('-password');

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            themePreference: user.themePreference,
            phone: user.phone,
            propertyName: user.propertyName,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
            settings: user.settings
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching profile' }, { status: 500 });
    }
}

// PUT /api/user/profile
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await req.json();

        const allowedUpdates = ['themePreference', 'name', 'phone', 'propertyName'];
        const updates: any = {};

        for (const key of allowedUpdates) {
            if (body[key] !== undefined) {
                updates[key] = body[key];
            }
        }

        // Validate themePreference if provided
        if (updates.themePreference && !['light', 'dark', 'system'].includes(updates.themePreference)) {
            return NextResponse.json({
                message: 'Invalid theme preference. Must be light, dark, or system.'
            }, { status: 400 });
        }

        const user = await User.findByIdAndUpdate(
            session.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                themePreference: user.themePreference,
                phone: user.phone,
                propertyName: user.propertyName
            }
        });
    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({
            message: error.message || 'Error updating profile'
        }, { status: 500 });
    }
}
