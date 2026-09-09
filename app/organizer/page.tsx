'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, ClockIcon, CheckCircle2Icon, ImageIcon, UploadIcon, XIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders, getAuthUploadHeaders } from '@/lib/auth-client';
import { canOrganize, isAdmin } from '@/lib/roles';
import { toast } from 'sonner';

type Step = 1 | 2;

function StepIndicator({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'text-primary' : done ? 'text-green-600' : 'text-muted-foreground'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-green-100 text-green-700' : 'bg-muted'}`}>
        {done ? <CheckCircle2Icon className="w-5 h-5" /> : n}
      </div>
      <span className="text-sm font-medium hidden sm:block">{label}</span>
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleLoading, setRoleLoading] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    fullDescription: '',
    category: 'music',
    date: '',
    time: '18:00',
    location: '',
    venue: '',
    hasSeating: false,
    hasBusTransport: true,
  });

  const [ticketData, setTicketData] = useState({
    ticketsTotal: '500',
    price: '3500',
    standardPrice: '3500',
    vipPrice: '5000',
    vvipPrice: '7500',
    category: 'music',
    time: '18:00',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/organizer');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/users/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          if (isAdmin(data.role)) {
            router.push('/admin');
            return;
          }
          if (!canOrganize(data.role)) {
            router.push('/dashboard');
          }
        }
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRole();
  }, [user, router]);

  const processFile = (file?: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be 5 MB or smaller');
      return;
    }
    setCoverFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCoverPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (authLoading || roleLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!eventData.title || !eventData.date || !eventData.location || !eventData.venue) {
        throw new Error('Please fill in all required event fields');
      }
      if (!coverFile && !coverPreview) {
        throw new Error('Please upload a cover photo for your event');
      }

      let imageUrl = coverPreview || '';

      if (coverFile) {
        try {
          const uploadHeaders = await getAuthUploadHeaders();
          const formData = new FormData();
          formData.append('file', coverFile);
          const uploadRes = await fetch('/api/upload/event-cover', {
            method: 'POST',
            headers: uploadHeaders,
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.url) imageUrl = uploadData.url;
          }
        } catch {
          // Fallback to local data URL if server upload fails
        }
      }

      const headers = await getAuthHeaders();
      const res = await fetch('/api/event-submissions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...eventData,
          seatingChart: eventData.hasSeating,
          busTransport: eventData.hasBusTransport,
          image: imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event submission');

      setSubmissionId(data.id);
      setTicketData((prev) => ({
        ...prev,
        category: eventData.category,
        time: eventData.time,
      }));
      setSuccess('Event saved with pending status. Now add your ticket details.');
      toast.success('Event saved — add ticket details next');
      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event submission';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionId) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/event-submissions/${submissionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          price: parseInt(ticketData.price),
          ticketsTotal: parseInt(ticketData.ticketsTotal),
          category: ticketData.category,
          time: ticketData.time,
          ticketTypes: [
            { name: 'Standard', price: Number(ticketData.standardPrice) },
            { name: 'VIP', price: Number(ticketData.vipPrice) },
            { name: 'VVIP', price: Number(ticketData.vvipPrice) },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save ticket details');

      toast.success('Tickets submitted for admin approval');
      router.push('/organizer/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save ticket details';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <StepIndicator n={1} label="Event Details" active={step === 1} done={step > 1} />
            <div className="h-px flex-1 bg-border" />
            <StepIndicator n={2} label="Ticket Details" active={step === 2} done={false} />
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {step === 1 ? 'Step 1: Event Information' : 'Step 2: Ticket Information'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {step === 1
              ? 'Your event is created with pending status. Nothing is published until admin approval.'
              : 'Add ticket price, quantity, time and category. Still pending until admin approves.'}
          </p>

          {/* <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 mb-8">
            <ClockIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Status: <strong>Pending</strong> — tickets are not live and no event is published until a system admin reviews and approves your submission.
            </p>
          </div> */}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 mb-6">
              <CheckCircle2Icon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleEventSubmit} className="space-y-8">
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="cover">Cover Photo *</FieldLabel>
                  <div className="mt-2 space-y-3">
                    <input
                      ref={fileInputRef}
                      id="cover"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCoverChange}
                      disabled={loading}
                      className="hidden"
                    />

                    {coverPreview ? (
                      <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-muted group border border-border">
                        <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-xl font-bold gap-2 cursor-pointer"
                          >
                            <UploadIcon className="w-4 h-4" />
                            Change Photo
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeCover}
                            className="rounded-xl font-bold gap-2 cursor-pointer"
                          >
                            <XIcon className="w-4 h-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-44 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center p-6 ${isDragging
                          ? 'border-primary bg-primary/10 scale-[1.01]'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50 bg-card'
                          }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          Drag & drop event cover photo here, or <span className="text-primary underline">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports JPEG, PNG or WebP (max 5 MB)
                        </p>
                      </div>
                    )}
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="title">Event Title *</FieldLabel>
                  <Input id="title" placeholder="e.g., Afrobeats Music Festival" value={eventData.title}
                    onChange={(e) => setEventData({ ...eventData, title: e.target.value })} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Short Description *</FieldLabel>
                  <Textarea id="description" placeholder="Brief description for listings" value={eventData.description}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })} className="min-h-20" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fullDescription">Full Description</FieldLabel>
                  <Textarea id="fullDescription" placeholder="Detailed event description" value={eventData.fullDescription}
                    onChange={(e) => setEventData({ ...eventData, fullDescription: e.target.value })} className="min-h-32" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="date">Event Date *</FieldLabel>
                    <Input id="date" type="date" value={eventData.date}
                      onChange={(e) => setEventData({ ...eventData, date: e.target.value })} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="event-time">Event Time *</FieldLabel>
                    <Input id="event-time" type="time" value={eventData.time}
                      onChange={(e) => setEventData({ ...eventData, time: e.target.value })} required />
                  </Field>
                </div>
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <FieldLabel>Ticket Types and Prices (MWK) *</FieldLabel>
                  {(['standardPrice', 'vipPrice', 'vvipPrice'] as const).map((field, index) => (
                    <div key={field} className="grid grid-cols-[1fr_2fr] items-center gap-3">
                      <span className="font-semibold">{['Standard', 'VIP', 'VVIP'][index]}</span>
                      <Input type="number" min="1" value={ticketData[field]} onChange={(e) => setTicketData({ ...ticketData, [field]: e.target.value })} required />
                    </div>
                  ))}
                </div>
                <Field>
                  <FieldLabel htmlFor="location">Location/City *</FieldLabel>
                  <Input id="location" placeholder="e.g., Lilongwe, Malawi" value={eventData.location}
                    onChange={(e) => setEventData({ ...eventData, location: e.target.value })} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="venue">Venue Name *</FieldLabel>
                  <Input id="venue" placeholder="e.g., BICC" value={eventData.venue}
                    onChange={(e) => setEventData({ ...eventData, venue: e.target.value })} required />
                </Field>
              </div>
              <div className="flex gap-4 pt-4 border-t border-border">
                <Link href="/organizer/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full cursor-pointer">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading} className="flex-1 bg-primary h-12 font-semibold cursor-pointer">
                  {loading ? 'Saving...' : 'Save Event →'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTicketSubmit} className="space-y-8">
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="category">Ticket Category *</FieldLabel>
                  <select id="category" value={ticketData.category}
                    onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background" required>
                    <option value="music">Music</option>
                    <option value="sports">Sports</option>
                    <option value="conference">Conference</option>
                    <option value="festival">Festival</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="ticketsTotal">Number of Tickets *</FieldLabel>
                    <Input id="ticketsTotal" type="number" min="1" value={ticketData.ticketsTotal}
                      onChange={(e) => setTicketData({ ...ticketData, ticketsTotal: e.target.value })} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="price">Price per Ticket (MWK) *</FieldLabel>
                    <Input id="price" type="number" min="1" value={ticketData.price}
                      onChange={(e) => setTicketData({ ...ticketData, price: e.target.value })} required />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="ticket-time">Event Time *</FieldLabel>
                  <Input id="ticket-time" type="time" value={ticketData.time}
                    onChange={(e) => setTicketData({ ...ticketData, time: e.target.value })} required />
                </Field>
              </div>
              <div className="flex gap-4 pt-4 border-t border-border">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-primary h-12 font-semibold">
                  {loading ? 'Submitting...' : 'Submit Tickets for Admin Approval'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
