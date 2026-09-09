'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthHeaders } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', fullDescription: '', category: 'music', date: '', time: '', location: '', venue: '', image: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/organizer/events/${params.id}`, { headers: await getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Event not found'); return; }
      setForm({ title: data.title, description: data.description || '', fullDescription: data.fullDescription || '', category: data.category || 'music', date: data.date, time: data.time, location: data.location, venue: data.venue, image: data.image || '', status: data.status });
    };
    void load();
  }, [params.id]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch(`/api/organizer/events/${params.id}`, { method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update event');
      toast.success('Event updated'); router.push('/organizer/events');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update event'); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-3xl p-4 sm:p-8"><Card className="p-6"><h1 className="text-2xl font-black">Edit Event</h1><p className="mt-1 text-sm text-muted-foreground">Changes are recorded in the administrator audit trail.</p><form onSubmit={save} className="mt-6 space-y-4">{[['title', 'Title'], ['location', 'Location'], ['venue', 'Venue'], ['image', 'Cover image URL']].map(([key, label]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key !== 'image'} /></div>)}<div><Label htmlFor="date">Date</Label><Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div><div><Label htmlFor="time">Time</Label><Input id="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required /></div><div><Label htmlFor="description">Description</Label><textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" /></div><div><Label htmlFor="status">Status</Label><select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="active">Active</option><option value="draft">Draft</option><option value="sold_out">Sold out</option><option value="cancelled">Cancelled</option></select></div><div className="flex gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></div></form></Card></main>;
}