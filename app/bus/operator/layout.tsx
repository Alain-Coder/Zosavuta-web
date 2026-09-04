import React from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const navItems = [
  { href: '/bus/operator/overview', label: 'Overview' },
  { href: '/bus/operator/buses', label: 'Bus Management' },
  { href: '/bus/operator/routes', label: 'Route Management' },
  { href: '/bus/operator/trips', label: 'Trip Scheduling' },
  { href: '/bus/operator/bookings', label: 'Bookings' },
  { href: '/bus/operator/manifest', label: 'Passenger Manifest' },
  { href: '/bus/operator/validation', label: 'Ticket Validation' },
  { href: '/bus/operator/reports', label: 'Reports' },
  { href: '/bus/operator/settings', label: 'Settings' },
];

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.className}>
      <nav className="bg-white shadow-md border-b border-gray-200">
        <ul className="flex space-x-4 p-4 max-w-7xl mx-auto">
          {navItems.map(item => (
            <li key={item.href}>
              <Link href={item.href} className="text-gray-700 hover:text-primary font-medium">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6 max-w-7xl mx-auto">{children}</main>
      <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Zosavuta Bus Ticketing
      </footer>
    </div>
  );
}
