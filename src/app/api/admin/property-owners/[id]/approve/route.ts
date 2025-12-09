import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { sendApprovalNotificationEmail } from '@/lib/email';

// PATCH /api/admin/property-owners/:id/approve
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
            return NextResponse.json({ message: 'Can only approve property owners' }, { status: 400 });
        }

        if (!user.emailVerifiedAt) {
            return NextResponse.json({
                message: 'User must verify email before approval'
            }, { status: 400 });
        }

        user.status = 'ACTIVE';
        await user.save();

        // Send approval notification email
        await sendApprovalNotificationEmail(user.email, user.name);

        return NextResponse.json({
            message: 'Property owner approved successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                status: user.status
            }
        });
    } catch (error: any) {
        console.error('Approval error:', error);
        return NextResponse.json({
            message: error.message || 'Error approving property owner'
        }, { status: 500 });
    }
}
