import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import mongoose from 'mongoose';
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
                    throw new Error('No user found');
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error('Invalid password');
                }

                if (!user.isVerified) {
                    // For the super admin (first user), we might want to bypass this or auto-verify? 
                    // But the spec says "Main super admin = original owner (client)".
                    // We can assume the seed script will create the super admin as verified.
                    // For others:
                    throw new Error('Email not verified');
                }

                if (!user.isApproved && user.role !== 'super_admin') {
                    throw new Error('Account pending approval by admin');
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
