import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <Sidebar />
            <main className="pl-64 min-h-screen">
                <div className="px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
