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
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Invalid credentials');
                }

                await connectDB();

                const user = await User.findOne({ email: credentials.email });

                if (!user) {
                    throw new Error('No user found with this email');
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error('Invalid password');
                }

                // Check user status
                // Allow login for PENDING_EMAIL_VERIFICATION to show verification screen
                // if (user.status === 'PENDING_EMAIL_VERIFICATION') {
                //     throw new Error('Please verify your email address. Check your inbox for the verification link.');
                // }

                if (user.status === 'PENDING_APPROVAL') {
                    throw new Error('Your account is awaiting admin approval. You will be notified once approved.');
                }

                if (user.status === 'REJECTED') {
                    throw new Error('Your account has been rejected. Please contact support for more information.');
                }

                if (user.status === 'SUSPENDED') {
                    throw new Error('Your account has been suspended. Please contact support.');
                }

                // For other statuses (e.g. DELETED), block access
                if (user.status !== 'ACTIVE' && user.status !== 'PENDING_EMAIL_VERIFICATION') {
                    throw new Error('Account is not active. Please contact support.');
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    themePreference: user.themePreference,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.status = user.status;
                token.themePreference = user.themePreference;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.themePreference = token.themePreference as string;

                // CRITICAL FIX: Always fetch fresh status from DB to reflect verification immediately
                // The JWT might still have the old 'PENDING_EMAIL_VERIFICATION' status
                if (token.id) {
                    try {
                        await connectDB();
                        const freshUser = await User.findById(token.id).select('status');
                        console.log('Session Check:', { tokenId: token.id, freshStatus: freshUser?.status, tokenStatus: token.status });
                        if (freshUser) {
                            session.user.status = freshUser.status;
                        } else {
                            session.user.status = token.status as string;
                        }
                    } catch (error) {
                        console.error("Error fetching fresh user status", error);
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
