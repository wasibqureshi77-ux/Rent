import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const users = await User.find({ role: { $nin: ['super_admin', 'SUPER_ADMIN'] } }).select('-password').sort({ createdAt: -1 });

        // Map users to include isVerified boolean based on status
        const mappedUsers = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isApproved: user.status === 'ACTIVE',
            isVerified: user.status !== 'PENDING_EMAIL_VERIFICATION',
            createdAt: user.createdAt,
            status: user.status,
            propertyName: user.propertyName
        }));

        return NextResponse.json(mappedUsers);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { userId, isApproved } = body;

        let updateData: any = {};

        if (isApproved) {
            // Activate User
            updateData.status = 'ACTIVE';

            // Also activate subscription if not active? 
            // We'll reset billing cycle if enabling access.
            const nextBilling = new Date();
            nextBilling.setDate(nextBilling.getDate() + 30);

            updateData['subscription.status'] = 'ACTIVE';
            updateData['subscription.nextBillingDate'] = nextBilling;
            updateData['subscription.lastPaymentDate'] = new Date();
        } else {
            // Suspend User
            updateData.status = 'SUSPENDED';
            updateData['subscription.status'] = 'INACTIVE';
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

        // Send approval notification email if user is being approved
        if (isApproved && user) {
            const { sendApprovalNotificationEmail } = await import('@/lib/email');
            await sendApprovalNotificationEmail(user.email, user.name);
        }

        return NextResponse.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isApproved: user.status === 'ACTIVE',
            isVerified: user.status !== 'PENDING_EMAIL_VERIFICATION',
            createdAt: user.createdAt
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { userId, name, email, propertyName, password, phone } = body;

        if (!userId || !name || !email) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Update basic fields
        user.name = name;
        user.email = email;
        user.propertyName = propertyName;
        user.phone = phone;

        // Update password if provided
        if (password && password.trim() !== '') {
            const bcrypt = (await import('bcryptjs')).default;
            user.password = await bcrypt.hash(password, 12);
        }

        await user.save();

        return NextResponse.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            propertyName: user.propertyName,
            phone: user.phone,
            isApproved: user.status === 'ACTIVE',
            isVerified: user.status !== 'PENDING_EMAIL_VERIFICATION',
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Error updating user details:', error);
        return NextResponse.json({ message: 'Error updating user details' }, { status: 500 });
    }
}
