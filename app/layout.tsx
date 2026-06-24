import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';

const syne = Syne({
    subsets: ['latin'],
    variable: '--font-syne',
    display: 'swap',
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'SSG Admin',
    description: 'Panel de administración SSG Distribuidora',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body className={`${syne.variable} ${dmSans.variable}`}>{children}</body>
        </html>
    );
}
