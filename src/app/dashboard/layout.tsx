import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    if (session.user.status === 'PENDING_EMAIL_VERIFICATION') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-800">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-4">Verify Your Email</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        We've sent a verification link to <span className="font-semibold text-gray-900 dark:text-white">{session.user.email}</span>. Please check your inbox and click the link to activate your dashboard.
                    </p>
                    <div className="w-full h-1 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" />
                    </div>
                    <script dangerouslySetInnerHTML={{
                        __html: `
                            setInterval(() => {
                                window.location.reload();
                            }, 5000);
                        `
                    }} />
                    <p className="text-xs text-gray-400 mt-6">
                        Auto-refreshing... (You may need to refresh manually after verification)
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <Sidebar />
            <main className="md:pl-64 min-h-screen pt-16 md:pt-0 transition-all duration-300">
                <div className="px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
