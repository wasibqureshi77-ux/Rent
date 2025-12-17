'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Zap, FileText, Settings, LogOut, Shield, Building2, FilePlus, X, Menu as Logs } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Properties', href: '/dashboard/properties', icon: Building2 },
    { name: 'Rooms', href: '/dashboard/rooms', icon: Zap },
    { name: 'Tenants', href: '/dashboard/tenants', icon: Users },
    { name: 'Generate Bill', href: '/dashboard/bills/generate', icon: FilePlus },
    { name: 'Bills', href: '/dashboard/bills', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const activeNavigation = session?.user?.role === 'SUPER_ADMIN'
        ? [...navigation, { name: 'Admin Users', href: '/dashboard/admin/users', icon: Shield }]
        : navigation;

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        P
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        PG Manage
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {isOpen ? <X className="h-6 w-6 text-gray-600 dark:text-gray-300" /> : <Logs className="h-6 w-6 text-gray-600 dark:text-gray-300" />}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "flex w-64 flex-col fixed inset-y-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out md:translate-x-0 pt-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Area (Hidden on Mobile since we have Top Bar, but Visible on Desktop) */}
                <div className="hidden md:flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            P
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                            PG Manage
                        </span>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Mobile Menu Header (Optional: Duplicate logo inside drawer or just padding) */}
                <div className="md:hidden h-16 flex items-center px-6 border-b border-gray-200/50 dark:border-gray-700/50">
                    <span className="font-semibold text-lg text-gray-900 dark:text-white">Menu</span>
                    <button onClick={() => setIsOpen(false)} className="ml-auto p-2">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
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
                                                    onClick={() => setIsOpen(false)}
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
        </>
    );
}
