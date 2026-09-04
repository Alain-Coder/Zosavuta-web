import React from 'react';
import { notFound } from 'next/navigation';

export default function BusLayout({ children }: { children: React.ReactNode }): never {
  // Bus ticketing is disabled until its data flows are fully dynamic.
  void children;
  notFound();
}
