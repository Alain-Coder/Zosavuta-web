import { useEffect, useState } from 'react';
import { Operator } from '@/types/operator';
import { toast } from 'sonner';

interface OperatorsTableProps {
  operators: Operator[];
  total: number;
  page: number;
  limit: number;
  onEdit: (op: Operator) => void;
  onSuspend: (op: Operator) => void;
  onPageChange: (newPage: number) => void;
}

export default function OperatorsTable({
  operators,
  total,
  page,
  limit,
  onEdit,
  onSuspend,
  onPageChange,
}: OperatorsTableProps) {
  const totalPages = Math.ceil(total / limit);

  const handleSuspend = async (op: Operator) => {
    try {
      const res = await fetch(`/api/admin/operator/${op.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to suspend');
      toast.success('Operator suspended');
      onPageChange(page); // trigger refresh via parent
    } catch (err) {
      console.error(err);
      toast.error('Suspend failed');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Phone</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {operators.map(op => (
            <tr key={op.id} className="border-t dark:border-gray-700">
              <td className="px-4 py-2">{op.email}</td>
              <td className="px-4 py-2">{op.name}</td>
              <td className="px-4 py-2">{op.phone ?? '-'}
              </td>
              <td className="px-4 py-2">
                {op.suspended ? (
                  <span className="text-red-600 font-medium">Suspended</span>
                ) : (
                  <span className="text-green-600 font-medium">Active</span>
                )}
              </td>
              <td className="px-4 py-2 space-x-2">
                <button
                  onClick={() => onEdit(op)}
                  className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80 transition"
                >
                  Edit
                </button>
                {!op.suspended && (
                  <button
                    onClick={() => handleSuspend(op)}
                    className="px-2 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/80 transition"
                  >
                    Suspend
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`px-3 py-1 rounded ${page <= 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/80'} transition`}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={`px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/80'} transition`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
