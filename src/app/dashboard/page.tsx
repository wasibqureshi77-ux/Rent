import DashboardStats from '@/components/dashboard/DashboardStats';

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    Overview of your properties and tenants.
                </p>
            </div>

            <DashboardStats />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Pending Payments</h2>
                    <div className="space-y-4">
                        {/* Placeholder for pending payments list */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">JD</div>
                                <div>
                                    <p className="font-medium">John Doe</p>
                                    <p className="text-xs text-gray-500">Room 101</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-red-600">₹  12,500</p>
                                <p className="text-xs text-red-500">Overdue 2 days</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-bold">AS</div>
                                <div>
                                    <p className="font-medium">Alice Smith</p>
                                    <p className="text-xs text-gray-500">Room 204</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-gray-200">₹  8,000</p>
                                <p className="text-xs text-yellow-600">Due today</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Meter Readings Needed</h2>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">The following rooms require new meter readings for the current month.</p>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                            <div>
                                <p className="font-medium">Room 302</p>
                                <p className="text-xs text-gray-500">Last reading: 12th Nov (1240 Units)</p>
                            </div>
                            <button className="text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-orange-600 transition-colors">
                                Add Reading
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                            <div>
                                <p className="font-medium">Room 305</p>
                                <p className="text-xs text-gray-500">Last reading: 10th Nov (980 Units)</p>
                            </div>
                            <button className="text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-orange-600 transition-colors">
                                Add Reading
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
