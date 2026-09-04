'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import OperatorsTable from '@/components/admin/OperatorsTable';
import OperatorDialog from '@/components/admin/OperatorDialog';
import { Operator } from '@/types/operator';

export default function AdminOperatorsPage() {
  const router = useRouter();

  // pagination state
  const [page, setPage] = useState(1);
  const limit = 10;

  // data state
  const [operators, setOperators] = useState<Operator[]>([]);
  const [total, setTotal] = useState(0);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | undefined>(undefined);

  const fetchOperators = async () => {
    try {
      const res = await fetch(`/api/admin/operators?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to load operators');
      const data = await res.json();
      setOperators(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      toast.error('Could not load operators');
    }
  };

  useEffect(() => {
    fetchOperators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAdd = () => {
    setEditingOperator(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (op: Operator) => {
    setEditingOperator(op);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchOperators();
    router.refresh();
  };

  return (
    <main className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Operators</h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
        >
          Add Operator
        </button>
      </div>
      <OperatorsTable
        operators={operators}
        total={total}
        page={page}
        limit={limit}
        onEdit={handleEdit}
        onSuspend={() => fetchOperators()}
        onPageChange={setPage}
      />
      <OperatorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        operator={editingOperator}
        onSuccess={handleDialogSuccess}
      />
    </main>
  );
}
