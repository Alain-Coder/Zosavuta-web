'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import OperatorsTable from '@/components/admin/OperatorsTable';
import OperatorDialog from '@/components/admin/OperatorDialog';
import { Operator } from '@/types/operator';
import { PlusIcon, BusIcon, UsersIcon } from 'lucide-react';

export default function AdminOperatorsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const limit = 10;

  const [operators, setOperators] = useState<Operator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | undefined>(undefined);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/operators?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to load operators');
      const data = await res.json();
      setOperators(data.data || data || []);
      setTotal(data.total || (data.data || data || []).length);
    } catch (err) {
      console.error(err);
      toast.error('Could not load operators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOperators();
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
    void fetchOperators();
    router.refresh();
  };

  const activeCount = operators.filter((op) => !op.suspended).length;
  const suspendedCount = operators.filter((op) => op.suspended).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Fleet Management</p>
          <h1 className="text-2xl font-black tracking-tight">Bus Operators</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage bus transport companies and operators on the platform.</p>
        </div>
        <Button onClick={handleAdd} className="gap-2 rounded-xl font-bold">
          <PlusIcon className="w-4 h-4" />
          Add Operator
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Operators</p>
            <UsersIcon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-black">{total}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active</p>
            <BusIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-600">{activeCount}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suspended</p>
            <BusIcon className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-500">{suspendedCount}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <OperatorsTable
            operators={operators}
            total={total}
            page={page}
            limit={limit}
            onEdit={handleEdit}
            onSuspend={() => void fetchOperators()}
            onPageChange={setPage}
          />
        )}
      </Card>

      <OperatorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        operator={editingOperator}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
