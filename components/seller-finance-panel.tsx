'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAuthHeaders } from '@/lib/auth-client';
import { ArrowUpRight, Loader2, WalletCards, Building2, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface Balance {
  pendingBalance: number;
  availableBalance: number;
  paidOutBalance: number;
  currency: string;
}

interface VerifiedBank {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface Payout {
  id: string;
  amount: number;
  feeAmount?: number;
  netAmount?: number;
  status: string;
  payoutDetails?: any;
  createdAt: string;
}

export default function SellerFinancePanel() {
  const [balance, setBalance] = useState<Balance>({ pendingBalance: 0, availableBalance: 0, paidOutBalance: 0, currency: 'MWK' });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [verifiedBank, setVerifiedBank] = useState<VerifiedBank | null>(null);
  const [kycApproved, setKycApproved] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async () => {
    try {
      const response = await fetch('/api/payouts', { headers: await getAuthHeaders() });
      const data = response.ok ? await response.json() : null;
      if (data) {
        setBalance(data.balance);
        setPayouts(data.payouts || []);
        setVerifiedBank(data.verifiedBank || null);
        setKycApproved(Boolean(data.kycApproved));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const numAmount = parseFloat(amount) || 0;
  // PayChangu Bank Payout Fee Formula: (payoutAmount * 0.017) + 700
  const bankPayoutFee = numAmount > 0 ? Math.round((numAmount * 0.017 + 700) * 100) / 100 : 0;
  const netBankPayout = numAmount > bankPayoutFee ? Math.max(0, Math.round((numAmount - bankPayoutFee) * 100) / 100) : 0;

  const requestPayout = async () => {
    if (!verifiedBank || !kycApproved) {
      setIsError(true);
      setMessage('Approved organizer verification with bank details is required before requesting payouts.');
      return;
    }

    if (numAmount <= bankPayoutFee) {
      setIsError(true);
      setMessage(`Requested amount must exceed the withdraw bank payout fee of MWK ${bankPayoutFee.toLocaleString()}.`);
      return;
    }

    setSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ amount: numAmount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payout request failed');
      setAmount('');
      setIsError(false);
      setMessage(data.message || 'Payout submitted for accounting review.');
      await load();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Payout request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <WalletCards className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Seller Funds & Settlement</h2>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Amount
              label="Pending Balance"
              value={balance.pendingBalance}
              hint="Held until the day after event concludes"
            />
            <Amount
              label="Available for Payout"
              value={balance.availableBalance}
              highlight
              hint="Cleared for bank withdrawal"
            />
            <Amount
              label="Total Paid Out"
              value={balance.paidOutBalance}
              hint="Dispatched to your bank account"
            />
          </div>

          {/* Verified Bank Details Banner (STRICT: Bank Transfer Only) */}
          <div className="p-4 rounded-xl border bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Payout Method: Bank Transfer Only
                  </p>
                  {verifiedBank ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-foreground">
                        {verifiedBank.bankName} · Acc: {verifiedBank.accountNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Account Holder: <span className="font-medium">{verifiedBank.accountName}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      No verified bank account found on your organizer profile.
                    </p>
                  )}
                </div>
              </div>

              {(!verifiedBank || !kycApproved) && (
                <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                  <Link href="/organizer/verification">
                    {kycApproved ? 'Add Bank Details' : 'Verify Account →'}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Request Bank Withdrawal</h3>
              <span className="text-xs text-muted-foreground">
                Withdrawal Bank Payout Fee: 1.7% + MWK 700
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  min="1"
                  max={balance.availableBalance}
                  placeholder="Amount to withdraw in MWK"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting || balance.availableBalance <= 0 || !verifiedBank}
                />
              </div>
              <Button
                onClick={() => void requestPayout()}
                disabled={submitting || !amount || numAmount <= 0 || numAmount > balance.availableBalance || !verifiedBank}
                className="shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-1.5" />
                    Request Bank Payout
                  </>
                )}
              </Button>
            </div>

            {/* Live Fee Calculation Breakdown */}
            {numAmount > 0 && (
              <div className="p-3.5 rounded-lg bg-muted/50 border text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Requested Payout:</span>
                  <span className="font-medium text-foreground">MWK {numAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Withdrawal Bank Transfer Fee:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    -MWK {bankPayoutFee.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-bold text-foreground">
                  <span>Net Bank Transfer to Account:</span>
                  <span className="text-primary text-sm">MWK {netBankPayout.toLocaleString()}</span>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${isError
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  }`}
              >
                {isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{message}</span>
              </div>
            )}
          </div>

          {/* Settlement Guidelines */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Settlement & Payout Policy</span>
            </div>
            <p className="text-muted-foreground">
              • Platform fee is 8% of gross ticket sales in which 3% is for ticket transaction fee taxes. Organizers receive 92% balance.
              <br />
              • Customer payment collection fees are absorbed by the platform and are not deducted from your balance.
              <br />
              • Funds from concluded events automatically move to available balance the day after the event completes.
              <br />
              • Payouts are dispatched exclusively via Bank Transfer upon administrative verification.
            </p>
          </div>

          {/* Recent Payout Requests */}
          {payouts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Payout Requests
              </h3>
              <div className="space-y-2">
                {payouts.slice(0, 5).map((payout) => {
                  const details = payout.payoutDetails;
                  return (
                    <div
                      key={payout.id}
                      className="p-3.5 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{payout.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${payout.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : payout.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : payout.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                          >
                            {payout.status}
                          </span>
                        </div>
                        {details?.bankName && (
                          <p className="text-[11px] text-muted-foreground">
                            Bank: {details.bankName} · Acc: {details.accountNumber}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          MWK {Number(payout.amount).toLocaleString()}
                        </p>
                        {Number(payout.feeAmount) > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Fee: MWK {Number(payout.feeAmount).toLocaleString()} · Net: MWK {Number(payout.netAmount || (Number(payout.amount) - Number(payout.feeAmount))).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Amount({ label, value, highlight, hint }: { label: string; value: number; highlight?: boolean; hint?: string }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`text-xl font-black mt-1 ${highlight ? 'text-primary' : 'text-foreground'}`}>
        MWK {Number(value || 0).toLocaleString()}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}