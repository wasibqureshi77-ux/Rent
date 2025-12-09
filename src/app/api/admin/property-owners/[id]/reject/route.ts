import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

// PATCH /api/admin/property-owners/:id/reject
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;

        const user = await User.findById(id);

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (user.role !== 'PROPERTY_OWNER') {
            return NextResponse.json({ message: 'Can only reject property owners' }, { status: 400 });
        }

        user.status = 'REJECTED';
        await user.save();

        return NextResponse.json({
            message: 'Property owner rejected',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                status: user.status
            }
        });
    } catch (error: any) {
        console.error('Rejection error:', error);
        return NextResponse.json({
            message: error.message || 'Error rejecting property owner'
        }, { status: 500 });
    }
}
