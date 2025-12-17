'use client';

import { Users, DollarSign, Activity, Clock } from 'lucide-react';

const staticStats = [
    { name: 'Total Tenants', value: '0', icon: Users, change: 'Active', changeType: 'neutral' },
    { name: 'Months Completed', value: '0', icon: Clock, change: 'Total Tenancy', changeType: 'neutral' },
    { name: 'Total Revenue', value: '₹0', icon: DollarSign, change: 'This month', changeType: 'neutral' },
    { name: 'Electricity Usage', value: '0 Units', icon: Activity, change: 'This month', changeType: 'neutral' },
];

interface DashboardStatsProps {
    data?: {
        activeTenants: number;
        totalOutstandingDue: number;
        totalRevenue: number;
        electricityUsage: number;
        billsThisMonth: number;
        totalOccupancyMonths?: number;
    }
}

export default function DashboardStats({ data }: DashboardStatsProps) {
    const stats = data ? [
        { name: 'Total Tenants', value: data.activeTenants.toString(), icon: Users, change: 'Active', changeType: 'neutral' },
        { name: 'Months Completed', value: (data.totalOccupancyMonths || 0).toString(), icon: Clock, change: 'Aggregate', changeType: 'positive' },
        { name: 'Total Revenue', value: `₹${data.totalRevenue.toLocaleString()}`, icon: DollarSign, change: 'Collected this month', changeType: 'positive' },
        { name: 'Electricity Usage', value: `${data.electricityUsage} Units`, icon: Activity, change: 'This month', changeType: 'neutral' },
    ] : staticStats;

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
                <div
                    key={item.name}
                    className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900/50 p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md"
                >
                    <dt>
                        <div className="absolute rounded-xl bg-orange-50 dark:bg-orange-900/10 p-3">
                            <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                        <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                            {item.name}
                        </p>
                    </dt>
                    <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {item.value}
                        </p>
                    </dd>
                    <div className="ml-16">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.changeType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                            {item.change}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
