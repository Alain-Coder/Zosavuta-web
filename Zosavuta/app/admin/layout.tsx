import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-0px)]">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
