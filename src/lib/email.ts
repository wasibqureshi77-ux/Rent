import crypto from 'crypto';

export function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function getVerificationTokenExpiry(): Date {
    // Token expires in 24 hours
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function sendVerificationEmail(email: string, token: string, name: string) {
    // In production, you would use a service like SendGrid, Resend, or Nodemailer
    // For now, we'll just log the verification link
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    console.log('='.repeat(80));
    console.log('EMAIL VERIFICATION');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Verification Link: ${verificationUrl}`);
    console.log('='.repeat(80));

    // TODO: Replace with actual email service
    // Example with Resend:
    // await resend.emails.send({
    //     from: 'noreply@yourdomain.com',
    //     to: email,
    //     subject: 'Verify your email',
    //     html: `<p>Hi ${name},</p><p>Please verify your email by clicking: <a href="${verificationUrl}">Verify Email</a></p>`
    // });

    return true;
}

export async function sendApprovalNotificationEmail(email: string, name: string) {
    console.log('='.repeat(80));
    console.log('ACCOUNT APPROVED NOTIFICATION');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Message: Your account has been approved! You can now login.`);
    console.log('='.repeat(80));

    // TODO: Replace with actual email service
    return true;
}
