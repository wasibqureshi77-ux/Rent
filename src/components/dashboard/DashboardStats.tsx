'use client';

import { Users, AlertCircle, DollarSign, Activity } from 'lucide-react';

const stats = [
    { name: 'Total Tenants', value: '12', icon: Users, change: '+2 this month', changeType: 'positive' },
    { name: 'Pending Bills', value: '3', icon: AlertCircle, change: 'Due > 3 days', changeType: 'negative' },
    { name: 'Total Revenue', value: '₹45,231', icon: DollarSign, change: '+12.5%', changeType: 'positive' },
    { name: 'Electricity Usage', value: '2,345 Units', icon: Activity, change: '-4% vs last month', changeType: 'positive' },
];

export default function DashboardStats() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
                <div
                    key={item.name}
                    className="relative overflow-hidden rounded-2xl bg-white dark:bg-card p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md"
                >
                    <dt>
                        <div className="absolute rounded-md bg-primary/10 p-3">
                            <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                        <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                            {item.name}
                        </p>
                    </dt>
                    <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {item.value}
                        </p>
                    </dd>
                    <div className="ml-16">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.changeType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                            {item.change}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
