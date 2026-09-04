import React from 'react';
import BusLayout from '@/app/bus/layout';

export default function ManagementPage() {
  return (
    <BusLayout>
      <h1 className="text-2xl font-bold mb-4">Bus Management</h1>
      <p className="text-muted-foreground">Here you can add, edit, and remove buses for your fleet.</p>
      {/* TODO: Implement CRUD UI for buses */}
    </BusLayout>
  );
}
