import React from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function BusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.className}>
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white shadow-lg">
        <ul className="flex space-x-6">
          <li>
            <Link href="/bus" className="hover:underline">Home</Link>
          </li>
          <li>
            <Link href="/bus/operator/overview" className="hover:underline">Operator Dashboard</Link>
          </li>
        </ul>
      </nav>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
