'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAuthHeaders } from '@/lib/auth-client';
import { ArrowUpRight, Loader2, WalletCards } from 'lucide-react';

interface Balance { pendingBalance: number; availableBalance: number; paidOutBalance: number; currency: string; }
interface Payout { id: string; amount: number; status: string; createdAt: string; }

export default function SellerFinancePanel() {
  const [balance, setBalance] = useState<Balance>({ pendingBalance: 0, availableBalance: 0, paidOutBalance: 0, currency: 'MWK' });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const response = await fetch('/api/payouts', { headers: await getAuthHeaders() });
      const data = response.ok ? await response.json() : null;
      if (data) { setBalance(data.balance); setPayouts(data.payouts || []); }
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const requestPayout = async () => {
    setSubmitting(true); setMessage('');
    try {
      const response = await fetch('/api/payouts', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ amount: Number(amount) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payout request failed');
      setAmount(''); setMessage('Payout submitted for accounting review.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Payout request failed'); }
    finally { setSubmitting(false); }
  };

  return <Card className="p-6"><div className="mb-5 flex items-center gap-3"><WalletCards className="h-5 w-5 text-primary" /><div><h2 className="font-bold">Seller funds</h2><p className="text-xs text-muted-foreground">Verified earnings and payout requests</p></div></div>{loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <><div className="grid gap-3 sm:grid-cols-3"><Amount label="Pending" value={balance.pendingBalance} /><Amount label="Available" value={balance.availableBalance} /><Amount label="Paid out" value={balance.paidOutBalance} /></div><div className="mt-6 flex flex-col gap-2 sm:flex-row"><Input type="number" min="1" max={balance.availableBalance} placeholder="Amount to withdraw" value={amount} onChange={(e) => setAmount(e.target.value)} /><Button onClick={() => void requestPayout()} disabled={submitting || !amount}><ArrowUpRight className="h-4 w-4" />Request payout</Button></div>{message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}<div className="mt-5 space-y-2">{payouts.slice(0, 3).map((payout) => <div key={payout.id} className="flex justify-between border-t pt-2 text-xs"><span>{payout.id} · {payout.status}</span><span>MWK {Number(payout.amount).toLocaleString()}</span></div>)}</div></>}</Card>;
}

function Amount({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">MWK {Number(value).toLocaleString()}</p></div>; }