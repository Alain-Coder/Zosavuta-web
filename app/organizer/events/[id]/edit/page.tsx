'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAuthHeaders } from '@/lib/auth-client';
import { toast } from 'sonner';
import {
  ImageIcon,
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  Loader2Icon,
  TicketIcon,
  SaveIcon,
  ArrowLeftIcon,
  XIcon,
} from 'lucide-react';

type TicketTier = { name: string; price: number };

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    fullDescription: '',
    category: 'music',
    date: '',
    time: '',
    location: '',
    venue: '',
    image: '',
    status: 'active',
    price: 0,
  });
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [initialImageUrl, setInitialImageUrl] = useState('');
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/organizer/events/${params.id}`, {
        headers: await getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Event not found'); return; }

      setForm({
        title: data.title || '',
        description: data.description || '',
        fullDescription: data.fullDescription || '',
        category: data.category || 'music',
        date: data.date || '',
        time: data.time || '',
        location: data.location || '',
        venue: data.venue || '',
        image: data.image || '',
        status: data.status || 'active',
        price: Number(data.price || 0),
      });
      setImagePreview(data.image || '');
      setInitialImageUrl(data.image || '');

      // Parse ticket tiers
      let tiers: TicketTier[] = [];
      try {
        if (typeof data.ticketTypes === 'string') {
          tiers = JSON.parse(data.ticketTypes);
        } else if (Array.isArray(data.ticketTypes)) {
          tiers = data.ticketTypes;
        }
      } catch { /* ignore */ }
      if (tiers.length === 0) {
        tiers = [{ name: 'Standard', price: Number(data.price || 0) }];
      }
      setTicketTiers(tiers);
    };
    void load();
  }, [params.id]);

  /* ── Image file picking (local preview only; upload occurs on save) ── */
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Only JPEG, PNG, and WebP images are allowed',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'File size must be 5 MB or smaller',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setImagePreview(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPendingCoverFile(null);
    setForm((f) => ({ ...f, image: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Ticket tier helpers ── */
  const addTier = () => setTicketTiers((t) => [...t, { name: '', price: 0 }]);

  const updateTier = (index: number, field: keyof TicketTier, value: string | number) => {
    setTicketTiers((tiers) =>
      tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: field === 'price' ? Number(value) : value } : tier
      )
    );
  };

  const removeTier = (index: number) => {
    if (ticketTiers.length <= 1) { toast.error('At least one ticket tier required'); return; }
    setTicketTiers((tiers) => tiers.filter((_, i) => i !== index));
  };

  /* ── Save (validates first, uploads only if clean, rolls back on error) ── */
  const save = async (e: FormEvent) => {
    e.preventDefault();

    // 1. Validate form fields before attempting any image upload
    if (!form.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!form.date) {
      toast.error('Event date is required');
      return;
    }
    if (!form.time) {
      toast.error('Event time is required');
      return;
    }
    if (!form.location.trim()) {
      toast.error('Event location is required');
      return;
    }
    if (!form.venue.trim()) {
      toast.error('Event venue is required');
      return;
    }
    if (ticketTiers.length === 0) {
      toast.error('At least one ticket tier required');
      return;
    }
    if (ticketTiers.some((t) => !t.name.trim() || Number(t.price) < 0 || isNaN(Number(t.price)))) {
      toast.error('All ticket tiers need a name and a valid non-negative price');
      return;
    }

    if (pendingCoverFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(pendingCoverFile.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }
      if (pendingCoverFile.size > 5 * 1024 * 1024) {
        toast.error('Cover image size must be 5 MB or smaller');
        return;
      }
    }

    setSaving(true);
    let newlyUploadedUrl: string | null = null;

    try {
      let finalImageUrl = form.image;

      // 2. Upload cover image only after all validations pass
      if (pendingCoverFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', pendingCoverFile);
        const headers = await getAuthHeaders();
        const { 'Content-Type': _ct, ...uploadHeaders } = headers as any;
        const uploadRes = await fetch('/api/upload/event-cover', {
          method: 'POST',
          headers: uploadHeaders,
          body: fd,
        });
        const uploadData = await uploadRes.json();
        setUploading(false);

        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData?.error || 'Failed to upload cover image');
        }
        newlyUploadedUrl = uploadData.url;
        finalImageUrl = uploadData.url;
      }

      // 3. Update the event
      const basePrice = ticketTiers[0]?.price ?? form.price;
      const payload = {
        ...form,
        title: form.title.trim(),
        location: form.location.trim(),
        venue: form.venue.trim(),
        image: finalImageUrl,
        price: basePrice,
        ticketTypes: ticketTiers,
      };

      const res = await fetch(`/api/organizer/events/${params.id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update event');
      }

      // 4. Update succeeded — delete previous cover if it was a local upload that got replaced
      if (
        newlyUploadedUrl &&
        initialImageUrl &&
        initialImageUrl.startsWith('/uploads/') &&
        initialImageUrl !== newlyUploadedUrl
      ) {
        fetch('/api/upload/event-cover', {
          method: 'DELETE',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ url: initialImageUrl }),
        }).catch(() => { });
      }

      toast.success('Event updated successfully');
      router.push('/organizer/events');
    } catch (err) {
      // 5. On any error, rollback the newly uploaded image immediately from server
      if (newlyUploadedUrl) {
        try {
          await fetch('/api/upload/event-cover', {
            method: 'DELETE',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ url: newlyUploadedUrl }),
          });
        } catch (cleanupErr) {
          console.error('Failed to cleanup newly uploaded cover image after error:', cleanupErr);
        }
      }

      toast.error(err instanceof Error ? err.message : 'Unable to update event');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const categories = ['music', 'sports', 'conference', 'festival', 'workshop', 'comedy', 'arts', 'food', 'networking', 'other'];

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Edit Event</p>
          <h1 className="text-2xl font-black">Update Event Details</h1>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Cover Image */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Cover Image
          </h2>

          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-muted">
              <img
                src={imagePreview}
                alt="Event cover"
                className="w-full h-full object-cover"
                onError={() => setImagePreview('')}
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2Icon className="w-3 h-3 animate-spin" /> : <UploadIcon className="w-3 h-3" />}
                  Replace
                </Button>
                <Button type="button" size="sm" variant="destructive" className="gap-1.5" onClick={removeImage}>
                  <XIcon className="w-3 h-3" /> Remove
                </Button>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2Icon className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-xl aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  <UploadIcon className="w-8 h-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-bold">Click to upload cover image</p>
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG or WebP · max 5 MB</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* URL fallback input */}
          <div className="flex gap-2">
            <Input
              placeholder="Or paste an image URL…"
              value={pendingCoverFile ? '' : form.image.startsWith('/uploads/') ? '' : form.image}
              onChange={(e) => {
                setPendingCoverFile(null);
                setForm((f) => ({ ...f, image: e.target.value }));
                setImagePreview(e.target.value);
              }}
              className="text-xs"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFilePick}
          />
        </Card>

        {/* Core Details */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Event Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1" />
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="time">Time *</Label>
              <Input id="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required className="mt-1" />
            </div>

            <div>
              <Label htmlFor="location">City / Location *</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="venue">Venue *</Label>
              <Input id="venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required className="mt-1" />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm capitalize"
              >
                {categories.map((c) => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="sold_out">Sold Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Short Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 min-h-20 w-full rounded-md border bg-background p-3 text-sm resize-none"
              placeholder="Brief summary shown on event cards…"
            />
          </div>
          <div>
            <Label htmlFor="fullDescription">Full Description</Label>
            <textarea
              id="fullDescription"
              value={form.fullDescription}
              onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
              className="mt-1 min-h-28 w-full rounded-md border bg-background p-3 text-sm resize-none"
              placeholder="Detailed event description shown on the event page…"
            />
          </div>
        </Card>

        {/* Ticket Tiers */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TicketIcon className="w-4 h-4" /> Ticket Tiers &amp; Prices
            </h2>
            <Button type="button" size="sm" variant="outline" onClick={addTier} className="gap-1.5 text-xs">
              <PlusIcon className="w-3.5 h-3.5" /> Add Tier
            </Button>
          </div>

          <div className="space-y-3">
            {ticketTiers.map((tier, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <div className="flex-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tier Name</Label>
                  <Input
                    value={tier.name}
                    onChange={(e) => updateTier(idx, 'name', e.target.value)}
                    placeholder="e.g. VIP, Standard, Early Bird"
                    className="mt-1 h-9 text-sm"
                    required
                  />
                </div>
                <div className="w-36">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Price (MWK)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={tier.price}
                    onChange={(e) => updateTier(idx, 'price', e.target.value)}
                    className="mt-1 h-9 text-sm"
                    required
                  />
                </div>
                {idx === 0 && (
                  <Badge className="mt-4 shrink-0 bg-primary/10 text-primary text-[10px] font-bold">Base price</Badge>
                )}
                {idx > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mt-4 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8"
                    onClick={() => removeTier(idx)}
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            The first tier is the base/default price. Changing prices here will affect new ticket purchases.
          </p>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" disabled={saving || uploading} className="flex-1 sm:flex-none gap-2">
            {saving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </main>
  );
}