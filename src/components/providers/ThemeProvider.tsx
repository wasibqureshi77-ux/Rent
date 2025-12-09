'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // Initialize theme from user preference or localStorage
    useEffect(() => {
        if (status === 'loading') return;

        if (session?.user?.themePreference) {
            setThemeState(session.user.themePreference as Theme);
        } else {
            const stored = localStorage.getItem('theme') as Theme;
            if (stored && ['light', 'dark', 'system'].includes(stored)) {
                setThemeState(stored);
            }
        }
    }, [session, status]);

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;

        let effectiveTheme: 'light' | 'dark' = 'light';

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            effectiveTheme = systemTheme;
        } else {
            effectiveTheme = theme;
        }

        setResolvedTheme(effectiveTheme);

        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);
    }, [theme]);

    // Listen to system theme changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const systemTheme = mediaQuery.matches ? 'dark' : 'light';
            setResolvedTheme(systemTheme);
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(systemTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);

        // Update user preference if logged in
        if (session) {
            try {
                await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ themePreference: newTheme }),
                });
            } catch (error) {
                console.error('Failed to update theme preference:', error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
