import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email or Mobile", type: "text" },
                password: { label: "Password", type: "password" },
                impersonationToken: { label: "Impersonation Token", type: "text" }
            },
            async authorize(credentials) {
                await connectDB();

                // Handle Impersonation
                if (credentials?.impersonationToken) {
                    try {
                        // In a real app, verify signature. Here we treat the token as "userId:adminId" string encoded/encrypted
                        // Simple base64 decode for this context or use JWT verify if we had `jsonwebtoken`.
                        // For robustness now: Assume token is "TARGET_USER_ID:ADMIN_ID:SECRET_SIGNATURE"
                        // Or simplify: The API that generates the token will stash it in DB, and we look it up? 
                        // Or just standard JWT verify.
                        // Let's rely on a JWT verification using `jsonwebtoken` (needs install? `next-auth` uses `jose` usually? No, `jsonwebtoken` is common).
                        // Let's assume we pass the raw TARGET USER ID, but ONLY if we can verify the caller.
                        // Wait, `authorize` is called from client side usually. We cannot trust client.
                        // We MUST verify the token.

                        // PLAN: 
                        // 1. API `/api/admin/impersonate` generates a `token` = signed JWT({ sub: targetUserId, adminId: adminId }, NEXTAUTH_SECRET).
                        // 2. Here we verify that token.
                        const jwt = (await import('jsonwebtoken')).default;
                        const payload = jwt.verify(credentials.impersonationToken, process.env.NEXTAUTH_SECRET!) as any;

                        if (!payload || !payload.sub || !payload.adminId) throw new Error("Invalid Token");

                        const user = await User.findById(payload.sub);
                        if (!user) throw new Error("User not found");

                        return {
                            id: user._id.toString(),
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            status: user.status,
                            themePreference: user.themePreference,
                            isImpersonating: true,
                            originalAdminId: payload.adminId
                        };
                    } catch (e) {
                        throw new Error('Invalid impersonation token');
                    }
                }

                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Invalid credentials');
                }

                // Check for email OR phone
                const user = await User.findOne({
                    $or: [
                        { email: credentials.email },
                        { phone: credentials.email }
                    ]
                });

                if (!user) {
                    throw new Error('No user found with this email or mobile number');
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error('Invalid password');
                }

                // Check user status
                if (user.status === 'PENDING_APPROVAL') {
                    throw new Error('Your account is awaiting admin approval. You will be notified once approved.');
                }

                if (user.status === 'REJECTED') {
                    throw new Error('Your account has been rejected. Please contact support for more information.');
                }

                if (user.status === 'SUSPENDED') {
                    throw new Error('Your account has been suspended. Please contact support.');
                }

                // Check Subscription Status (Only for Property Owners)
                if (user.role === 'PROPERTY_OWNER') {
                    const now = new Date();
                    const nextBilling = user.subscription?.nextBillingDate ? new Date(user.subscription.nextBillingDate) : null;
                    const isOverdue = user.subscription?.status === 'OVERDUE';
                    const isExpired = nextBilling && nextBilling < now;

                    if (isOverdue || isExpired) {
                        // Automatically update status in DB if expired but not marked
                        if (isExpired && user.subscription?.status !== 'OVERDUE') {
                            await User.findByIdAndUpdate(user._id, { 'subscription.status': 'OVERDUE' });
                        }
                        // We NO LONGER throw error here, allowing them to login to see the payment popup
                    }
                }

                // For other statuses (e.g. DELETED), block access
                if (user.status !== 'ACTIVE' && user.status !== 'PENDING_EMAIL_VERIFICATION') {
                    throw new Error('Account is not active. Please contact support.');
                }

                // Determine final status for session
                let finalStatus = user.status;
                if (user.role === 'PROPERTY_OWNER') {
                    const now = new Date();
                    const nextBilling = user.subscription?.nextBillingDate ? new Date(user.subscription.nextBillingDate) : null;
                    const isOverdue = user.subscription?.status === 'OVERDUE';
                    const isExpired = nextBilling && nextBilling < now;

                    if (isOverdue || isExpired) {
                        finalStatus = 'OVERDUE';
                        // Keep DB updated
                        if (isExpired && user.subscription?.status !== 'OVERDUE') {
                            await User.findByIdAndUpdate(user._id, { 'subscription.status': 'OVERDUE' });
                        }
                    }
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: finalStatus,
                    themePreference: user.themePreference,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.status = user.status;
                token.themePreference = user.themePreference;
                if ((user as any).isImpersonating) {
                    token.isImpersonating = true;
                    token.originalAdminId = (user as any).originalAdminId;
                }
            }

            // Persistence
            if (token.isImpersonating) {
                // Keep these fields
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.themePreference = token.themePreference as string;
                (session.user as any).isImpersonating = token.isImpersonating as boolean;
                (session.user as any).originalAdminId = token.originalAdminId as string;

                // CRITICAL FIX: Always fetch fresh status from DB to reflect verification immediately
                if (token.id && typeof token.id === 'string') {
                    try {
                        await connectDB();
                        // Verify format to prevent BSON errors
                        if (token.id.match(/^[0-9a-fA-F]{24}$/)) {
                            const freshUser = await User.findById(token.id).select('status role subscription email');
                            if (freshUser) {
                                let currentStatus = freshUser.status;

                                // Check subscription expiration in session
                                if (freshUser.role === 'PROPERTY_OWNER') {
                                    const now = new Date();
                                    const nextBilling = freshUser.subscription?.nextBillingDate ? new Date(freshUser.subscription.nextBillingDate) : null;

                                    console.log(`[AUTH DEBUG] User: ${freshUser.email}`);
                                    console.log(`[AUTH DEBUG] Status: ${freshUser.status}`);
                                    console.log(`[AUTH DEBUG] Next Billing: ${nextBilling}`);
                                    console.log(`[AUTH DEBUG] Is Expired: ${nextBilling && nextBilling < now}`);

                                    if ((freshUser.subscription?.status === 'OVERDUE') || (nextBilling && nextBilling < now)) {
                                        currentStatus = 'OVERDUE';
                                    }
                                }

                                session.user.status = currentStatus;
                                console.log(`[AUTH DEBUG] Final Session Status: ${currentStatus}`);
                            } else {
                                session.user.status = token.status as string;
                            }
                        } else {
                            session.user.status = token.status as string;
                        }
                    } catch (error) {
                        console.error("Error fetching fresh user status:", error);
                        session.user.status = token.status as string;
                    }
                } else {
                    session.user.status = token.status as string;
                }
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
