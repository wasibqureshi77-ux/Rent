import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, LayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-gray-900 dark:via-black dark:to-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            P
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            PG Manage
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-orange-600 shadow-md hover:shadow-lg transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-purple-300/30 rounded-full blur-3xl" />
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-amber-300/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/50 dark:bg-white/10 border border-gray-200 dark:border-gray-800 backdrop-blur-sm text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">
            <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
            Secure & Efficient Management
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
            Manage your <span className="text-primary">PG & Tenants</span> <br /> with ease.
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            The all-in-one solution for property owners. Track rents, calculate electricity bills automatically, and manage monthly dues effortlessy.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/dashboard" className="px-8 py-4 text-lg font-bold text-white bg-primary rounded-xl hover:bg-orange-600 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Go to Dashboard
            </Link>
            <Link href="/register" className="px-8 py-4 text-lg font-bold text-gray-900 dark:text-white bg-white dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              Start Free Trial
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
          {features.map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all text-left">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-500">
        © 2024 PG Management System. All rights reserved.
      </footer>
    </div>
  );
}

import { UserCheck, Calculator, Bell } from 'lucide-react';

const features = [
  {
    title: 'Tenant Tracking',
    desc: 'Keep detailed records of all your tenants, including ID proofs and contact info.',
    icon: UserCheck
  },
  {
    title: 'Smart Billing',
    desc: 'Auto-calculate electricity charges based on meter readings and fixed unit rates.',
    icon: Calculator
  },
  {
    title: 'Dues Reminders',
    desc: 'Never miss a payment with automated tracking of pending and partial payments.',
    icon: Bell
  }
];
