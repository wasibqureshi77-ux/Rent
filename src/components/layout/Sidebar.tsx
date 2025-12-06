'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Zap, FileText, Settings, LogOut, Shield } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Tenants', href: '/dashboard/tenants', icon: Users },
    { name: 'Meter Readings', href: '/dashboard/readings', icon: Zap },
    { name: 'Bills', href: '/dashboard/bills', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const activeNavigation = session?.user?.role === 'super_admin'
        ? [...navigation, { name: 'Admin Users', href: '/dashboard/admin/users', icon: Shield }]
        : navigation;

    return (
        <div className="flex w-64 flex-col fixed inset-y-0 z-50 glass dark:glass-dark border-r border-gray-200 dark:border-gray-800">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        P
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        PG Manage
                    </span>
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-y-7 overflow-y-auto px-6 py-4">
                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {activeNavigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    isActive
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary',
                                                    'group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all duration-200 items-center'
                                                )}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-primary',
                                                        'h-5 w-5 shrink-0 transition-colors'
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>

                        <li className="mt-auto">
                            <div className="flex items-center gap-x-4 py-3 text-sm font-semibold leading-6 text-gray-900 dark:text-white border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-amber-500 flex items-center justify-center text-white text-xs">
                                    {session?.user?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="sr-only">Your profile</span>
                                <span aria-hidden="true" className="truncate w-full">
                                    {session?.user?.name}
                                    <p className="text-xs text-gray-400 font-normal truncate">{session?.user?.email}</p>
                                </span>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="w-full mt-2 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all items-center"
                            >
                                <LogOut className="h-5 w-5 shrink-0" />
                                Sign out
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
