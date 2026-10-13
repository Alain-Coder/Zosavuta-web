'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAuthHeaders } from '@/lib/auth-client';
import {
  Smartphone,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Tag,
  Clock,
  CheckCheck,
  TrendingUp,
} from 'lucide-react';

interface Balance {
  pendingBalance: number;
  availableBalance: number;
  paidOutBalance: number;
  currency: string;
}

interface Payout {
  id: string;
  amount: number;
  feeAmount?: number;
  netAmount?: number;
  status: string;
  payoutDetails?: {
    method?: string;
    operator?: string;
    phoneNumber?: string;
    payoutFeePercent?: number;
    feeAmount?: number;
    netAmount?: number;
  };
  createdAt: string;
}

interface ResaleTicket {
  id: string;
  price: number;
  status: string;
  createdAt: string;
  soldAt?: string;
  eventTitle?: string;
  eventDate?: string;
}

type MobileOperator = 'Airtel Money' | 'Tnm Mpamba';

export default function AttendeeFinancePanel() {
  const [balance, setBalance] = useState<Balance>({
    pendingBalance: 0,
    availableBalance: 0,
    paidOutBalance: 0,
    currency: 'MWK',
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [resaleTickets, setResaleTickets] = useState<ResaleTicket[]>([]);
  const [loading, setLoading] = useState(true);
  // Controls visibility: only shown to users who have ever listed a resale ticket
  const [hasResaleActivity, setHasResaleActivity] = useState<boolean | null>(null);

  // Form states
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator>('Airtel Money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadData = async () => {
    try {
      const response = await fetch('/api/payouts', { headers: await getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const tickets: ResaleTicket[] = data.resaleTickets || [];
        const payoutList: Payout[] = data.payouts || [];
        setBalance(data.balance || { pendingBalance: 0, availableBalance: 0, paidOutBalance: 0, currency: 'MWK' });
        setPayouts(payoutList);
        setResaleTickets(tickets);
        // Show panel if user has any resale listings OR any payout history
        setHasResaleActivity(tickets.length > 0 || payoutList.length > 0);
      } else {
        setHasResaleActivity(false);
      }
    } catch (err) {
      console.error('Error fetching attendee payout data:', err);
      setHasResaleActivity(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Fee rates: Airtel 1.8%, TNM 1.5%
  const feePercent = selectedOperator === 'Airtel Money' ? 1.8 : 1.5;
  const numAmount = parseFloat(amount) || 0;
  const payoutFee = numAmount > 0 ? Math.round((numAmount * (feePercent / 100)) * 100) / 100 : 0;
  const netPayout = numAmount > payoutFee ? Math.max(0, Math.round((numAmount - payoutFee) * 100) / 100) : 0;

  // While loading or no resale activity, render nothing so the panel doesn't
  // show up for users who have never listed or sold a resale ticket.
  if (loading || hasResaleActivity === null) return null;
  if (!hasResaleActivity) return null;


  const handleMaxAmount = () => {
    if (balance.availableBalance > 0) {
      setAmount(String(Math.floor(balance.availableBalance)));
    }
  };

  const handleRequestPayout = async () => {
    setMessage('');
    setIsError(false);

    // 1. Validate phone number
    const cleanPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (!cleanPhone) {
      setIsError(true);
      setMessage('Please enter your Mobile Money phone number before requesting payout.');
      return;
    }

    const digits = cleanPhone.replace(/^\+?265/, '').replace(/^0/, '');
    if (digits.length !== 9 || !/^\d{9}$/.test(digits)) {
      setIsError(true);
      setMessage('Please enter a valid 9 or 10 digit Malawi phone number (e.g. 099xxxxxxx or 088xxxxxxx).');
      return;
    }

    if (selectedOperator === 'Airtel Money' && !digits.startsWith('9')) {
      setIsError(true);
      setMessage('Airtel Money phone numbers must start with 09 (e.g. 099... or 098...).');
      return;
    }

    if (selectedOperator === 'Tnm Mpamba' && !digits.startsWith('8')) {
      setIsError(true);
      setMessage('TNM Mpamba phone numbers must start with 08 (e.g. 088...).');
      return;
    }

    // 2. Validate amount
    if (!amount || numAmount <= 0) {
      setIsError(true);
      setMessage('Please enter a valid amount to withdraw.');
      return;
    }

    if (numAmount > balance.availableBalance) {
      setIsError(true);
      setMessage(`Amount exceeds your available balance of MWK ${balance.availableBalance.toLocaleString()}.`);
      return;
    }

    if (numAmount <= payoutFee) {
      setIsError(true);
      setMessage(`Withdrawal amount must be greater than the ${feePercent}% withdrawal fee of MWK ${payoutFee.toLocaleString()}.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          amount: numAmount,
          method: 'MOBILE_MONEY',
          operator: selectedOperator,
          phoneNumber: `0${digits}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payout request');
      }

      setIsError(false);
      setMessage(data.message || `Payout request for MWK ${numAmount.toLocaleString()} submitted successfully.`);
      setAmount('');
      await loadData();
    } catch (err: any) {
      setIsError(true);
      setMessage(err?.message || 'Failed to request payout');
    } finally {
      setSubmitting(false);
    }
  };

  const soldResaleTickets = resaleTickets.filter((t) => t.status === 'SOLD');

  return (
    <Card className="p-6 border border-border bg-card shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-black text-lg text-foreground">Resale Ticket Earnings & Payouts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receive payouts directly to your Airtel Money or TNM Mpamba mobile wallet
            </p>
          </div>
        </div>
        <Link href="/marketplace">
          <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
            <Tag className="w-3.5 h-3.5 text-orange-600" />
            Marketplace
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                Available for Payout
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                MWK {Number(balance.availableBalance).toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">Cleared & ready for mobile money withdrawal</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Pending Balance
              </span>
              <p className="text-2xl font-black text-foreground">
                MWK {Number(balance.pendingBalance).toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">Held until the day after the event concludes</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Paid Out
              </span>
              <p className="text-2xl font-black text-foreground">
                MWK {Number(balance.paidOutBalance).toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">Successfully sent to your mobile wallet</p>
            </div>
          </div>

          {/* Mobile Money Payout Form */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wide">
                Request Mobile Money Payout
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select your provider, enter your registered phone number, and specify the amount.
              </p>
            </div>

            {/* Provider Selection (Airtel Money 1.8% vs TNM Mpamba 1.5%) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Select Mobile Money Provider *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOperator('Airtel Money')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${selectedOperator === 'Airtel Money'
                    ? 'border-red-500 bg-red-500/5 shadow-sm'
                    : 'border-border bg-card hover:border-red-300 hover:bg-muted/30'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                      AM
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Airtel Money</p>
                      <p className="text-xs text-muted-foreground">Prefix: 099... / 098...</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOperator('Tnm Mpamba')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${selectedOperator === 'Tnm Mpamba'
                    ? 'border-emerald-600 bg-emerald-600/5 shadow-sm'
                    : 'border-border bg-card hover:border-emerald-300 hover:bg-muted/30'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                      TM
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">TNM Mpamba</p>
                      <p className="text-xs text-muted-foreground">Prefix: 088...</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Inputs: Phone Number & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {selectedOperator} Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder={selectedOperator === 'Airtel Money' ? 'e.g. 0991234567' : 'e.g. 0881234567'}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={submitting}
                  className="h-10 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Must be registered to receive {selectedOperator} transfers
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Withdrawal Amount (MWK) *</label>
                  {balance.availableBalance > 0 && (
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Use Max (MWK {balance.availableBalance.toLocaleString()})
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min="1"
                  max={balance.availableBalance}
                  placeholder="Amount in MWK"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting || balance.availableBalance <= 0}
                  className="h-10 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Available: MWK {balance.availableBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Real-time Fee Breakdown */}
            {numAmount > 0 && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Withdrawal:</span>
                  <span className="font-semibold text-foreground">MWK {numAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{selectedOperator} Fee ({feePercent}%):</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    -MWK {payoutFee.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-border/60 pt-1.5 flex justify-between font-bold">
                  <span className="text-foreground">You Will Receive:</span>
                  <span className="text-primary text-sm font-black">MWK {netPayout.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Message alert */}
            {message && (
              <div
                className={`p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium ${isError
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  }`}
              >
                {isError ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{message}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="button"
              onClick={() => void handleRequestPayout()}
              disabled={
                submitting ||
                balance.availableBalance <= 0 ||
                !amount ||
                numAmount <= 0 ||
                numAmount > balance.availableBalance ||
                !phoneNumber.trim()
              }
              className="w-full sm:w-auto h-10 px-6 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Payout...
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Request Payout via {selectedOperator}
                </>
              )}
            </Button>
          </div>

          {/* Resale Payout Policy & Guidelines */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs space-y-1.5 text-muted-foreground">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Info className="w-4 h-4 text-primary" />
              <span>Resale Payout Guidelines</span>
            </div>
            <p>
              • Resale payouts are issued exclusively via <strong>Mobile Money (Airtel Money or TNM Mpamba)</strong>.
              <br />
              • Withdrawal fee is <strong>1.8% for Airtel Money</strong> and <strong>1.5% for TNM Mpamba</strong>.
              <br />
              • Funds from sold resale tickets move from pending to available balance the day after the event concludes.
            </p>
          </div>

          {/* Recent Payout Requests */}
          {payouts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Payout Requests ({payouts.length})
              </h3>
              <div className="divide-y divide-border border rounded-xl overflow-hidden bg-card">
                {payouts.map((payout) => {
                  const details = payout.payoutDetails;
                  const isMobile = details?.method === 'MOBILE_MONEY' || Boolean(details?.phoneNumber);
                  const op = details?.operator || (isMobile ? 'Mobile Money' : 'Bank Transfer');
                  const phone = details?.phoneNumber;
                  const fee = Number(payout.feeAmount || details?.feeAmount || 0);
                  const net = Number(payout.netAmount || details?.netAmount || (payout.amount - fee));

                  return (
                    <div key={payout.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{payout.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${payout.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : payout.status === 'FAILED' || payout.status === 'CANCELLED'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                          >
                            {payout.status.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground">
                            {op}
                          </span>
                        </div>
                        {phone && (
                          <p className="text-muted-foreground">
                            Recipient Number: <span className="font-mono font-bold text-foreground">{phone}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Requested: {new Date(payout.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-left sm:text-right space-y-0.5 shrink-0">
                        <p className="font-bold text-foreground">
                          Gross: MWK {Number(payout.amount).toLocaleString()}
                        </p>
                        {fee > 0 && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            Fee: -MWK {fee.toLocaleString()}
                          </p>
                        )}
                        <p className="text-sm font-black text-primary">
                          Net: MWK {net.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sold Resale Tickets History */}
          {soldResaleTickets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                Resold Tickets History ({soldResaleTickets.length})
              </h3>
              <div className="divide-y divide-border border rounded-xl overflow-hidden bg-card">
                {soldResaleTickets.map((t) => (
                  <div key={t.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{t.eventTitle || 'Resold Ticket'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.eventDate ? `Event Date: ${t.eventDate} · ` : ''}
                        Sold: {t.soldAt ? new Date(t.soldAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        +MWK {Number(t.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
