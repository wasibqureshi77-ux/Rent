import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

// POST /api/admin/impersonate - Generate impersonation token
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    // Verify Super Admin
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'super_admin')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await req.json();
        const { targetUserId } = body;

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Check if admin is trying to impersonate another admin? Allowed? Yes for now.

        // Generate a token
        if (!process.env.NEXTAUTH_SECRET) {
            throw new Error('NEXTAUTH_SECRET not set');
        }

        const payload = {
            sub: targetUser._id.toString(),
            adminId: session.user.id,
            issuedAt: Date.now()
        };

        const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET, { expiresIn: '5m' }); // Short lived token just for handshake

        return NextResponse.json({ token });
    } catch (error) {
        console.error('Impersonation error:', error);
        return NextResponse.json({ message: 'Error generating token' }, { status: 500 });
    }
}
