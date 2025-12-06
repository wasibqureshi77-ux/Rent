import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const users = await User.find({ role: { $ne: 'super_admin' } }).select('-password').sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { userId, isApproved } = body;

        const user = await User.findByIdAndUpdate(userId, { isApproved }, { new: true });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
    }
}
