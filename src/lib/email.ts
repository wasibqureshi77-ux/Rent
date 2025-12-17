import crypto from 'crypto';
import nodemailer from 'nodemailer';

export function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function getVerificationTokenExpiry(): Date {
    // Token expires in 24 hours
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    secure: process.env.EMAIL_SERVER_SECURE === 'true', // true for 465, false for other ports
});

export async function sendVerificationEmail(email: string, token: string, name: string) {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const from = process.env.EMAIL_FROM || 'noreply@example.com';

    console.log(`Sending verification email to ${email}`);

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: 'Verify your email for PG Manage',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Verify Your Email</h2>
                    <p>Hi ${name},</p>
                    <p>Thank you for registering with PG Manage. Please verify your email address by clicking the button below:</p>
                    <p>
                        <a href="${verificationUrl}" style="background-color: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                    </p>
                    <p>Or verify using this link:</p>
                    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                    <p>This link will expire in 24 hours.</p>
                </div>
            `,
        });
        console.log('Verification email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

export async function sendApprovalNotificationEmail(email: string, name: string) {
    const from = process.env.EMAIL_FROM || 'noreply@example.com';
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

    console.log(`Sending approval email to ${email}`);

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: 'Your PG Manage Account is Approved',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Account Approved!</h2>
                    <p>Hi ${name},</p>
                    <p>Great news! Your account has been approved by the administrator.</p>
                    <p>You can now log in and start managing your properties.</p>
                    <p>
                        <a href="${loginUrl}" style="background-color: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Dashboard</a>
                    </p>
                </div>
            `,
        });
        console.log('Approval email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending approval email:', error);
        return false;
    }
}
