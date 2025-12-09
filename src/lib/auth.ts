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
                if (user.status === 'PENDING_EMAIL_VERIFICATION') {
                    throw new Error('Please verify your email address. Check your inbox for the verification link.');
                }

                if (user.status === 'PENDING_APPROVAL') {
                    throw new Error('Your account is awaiting admin approval. You will be notified once approved.');
                }

                if (user.status === 'REJECTED') {
                    throw new Error('Your account has been rejected. Please contact support for more information.');
                }

                if (user.status === 'SUSPENDED') {
                    throw new Error('Your account has been suspended. Please contact support.');
                }

                if (user.status !== 'ACTIVE') {
                    throw new Error('Account is not active. Please contact support.');
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
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
                token.themePreference = user.themePreference;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.themePreference = token.themePreference as string;
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
