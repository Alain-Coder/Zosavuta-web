import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Operator } from '@/types/operator';

interface OperatorDialogProps {
  open: boolean;
  onClose: () => void;
  operator?: Operator; // present when editing
  onSuccess: () => void; // refresh parent data
}

export default function OperatorDialog({ open, onClose, operator, onSuccess }: OperatorDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Populate fields when editing
  useEffect(() => {
    if (operator) {
      setEmail(operator.email);
      setName(operator.name);
      setPhone(operator.phone ?? '');
    } else {
      setEmail('');
      setName('');
      setPhone('');
    }
  }, [operator, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { email, name, phone };
      let res: Response;
      if (operator) {
        // Edit existing operator
        res = await fetch(`/api/admin/operator/${operator.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new operator
        res = await fetch('/api/admin/operators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Request failed');
      toast.success(operator ? 'Operator updated' : 'Operator created');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Operation failed');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4 p-6 transform transition-all animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">
          {operator ? 'Edit Operator' : 'Create Operator'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              {operator ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
