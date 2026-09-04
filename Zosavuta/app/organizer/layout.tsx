import { OrganizerShell } from '@/components/organizer/organizer-shell';

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-0px)]">
      <OrganizerShell>{children}</OrganizerShell>
    </div>
  );
}
