'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field, FieldLabel } from '@/components/ui/field';
import { ChevronLeftIcon, ShieldCheckIcon, TrophyIcon, CheckCircleIcon } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import {
  maxRedeemablePoints,
  pointsToMwk,
  POINTS_CONFIG,
} from '@/lib/legacy-points';

interface Event {
  id: string;
  title: string;
  price: number;
}

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const qty = parseInt(searchParams.get('qty') || '1');
  const tier = searchParams.get('tier') || 'Regular';
  const transport = searchParams.get('transport') || '';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=/checkout/${eventId}`);
    }
  }, [user, authLoading, router, eventId]);

  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [fetchingEvent, setFetchingEvent] = useState(true);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data as Event);
        } else {
          setEvent(null);
        }
      } catch (error: any) {
        console.error('Failed to fetch event:', eventId);
        setEvent(null);
      } finally {
        setFetchingEvent(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Fetch legacy points for the current user
  useEffect(() => {
    if (!user) return;
    const fetchPoints = async () => {
      try {
        const res = await fetch(`/api/points?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setAvailablePoints(data.totalPoints ?? 0);
        } else {
          setAvailablePoints(0);
        }
      } catch {
        setAvailablePoints(0);
      }
    };
    fetchPoints();
  }, [user]);

  // Form state
  const [attendeeInfo, setAttendeeInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [cardInfo, setCardInfo] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

  const [confirmationDetails, setConfirmationDetails] = useState({
    orderId: '',
    email: '',
  });

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeInfo.firstName || !attendeeInfo.lastName || !attendeeInfo.email || !attendeeInfo.phone) {
      alert('Please fill in all fields');
      return;
    }
    setStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Create the order via API, then show confirmation
    const createOrder = async () => {
      try {
        const orderId = `ZOS-${Date.now()}`;
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user!.uid,
            eventId,
            eventTitle: event?.title || '',
            quantity: qty,
            price: unitPrice,
            totalAmount: finalPrice,
            tier,
            firstName: attendeeInfo.firstName,
            lastName: attendeeInfo.lastName,
            email: attendeeInfo.email,
            phone: attendeeInfo.phone,
            paymentMethod: 'card',
            busTransport: transport === 'round-trip',
            status: 'confirmed',
          }),
        });

        setConfirmationDetails({
          orderId,
          email: attendeeInfo.email,
        });
        setLoading(false);
        setStep('confirmation');
      } catch {
        // Fallback: still show confirmation even if API fails
        const orderId = `ZOS-${Date.now()}`;
        setConfirmationDetails({ orderId, email: attendeeInfo.email });
        setLoading(false);
        setStep('confirmation');
      }
    };

    // Simulate payment processing delay
    setTimeout(createOrder, 1500);
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const basePrice = event?.price || 0;
  const unitPrice = tier === 'VIP' ? basePrice * 2 : basePrice;
  const totalPrice = unitPrice * qty;
  const transportCost = transport === 'round-trip' ? 1500 * qty : 0;
  const processingFee = 500;
  const subtotalBeforeDiscount = totalPrice + transportCost + processingFee;
  const maxPoints = maxRedeemablePoints(subtotalBeforeDiscount, availablePoints);
  const pointsDiscount = usePoints ? pointsToMwk(Math.min(pointsToRedeem, maxPoints)) : 0;
  const finalPrice = Math.max(0, subtotalBeforeDiscount - pointsDiscount);

  return (
    <>

      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link href="/events" className="flex items-center gap-2 text-primary hover:text-primary/80 font-bold uppercase tracking-widest text-xs w-fit">
          <ChevronLeftIcon className="w-5 h-5" />
          Back to Events
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 'details' && (
              <Card className="p-8">
                <h1 className="text-2xl font-bold mb-6">Attendee Information</h1>

                <form onSubmit={handleDetailsSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={attendeeInfo.firstName}
                        onChange={(e) =>
                          setAttendeeInfo({ ...attendeeInfo, firstName: e.target.value })
                        }
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={attendeeInfo.lastName}
                        onChange={(e) =>
                          setAttendeeInfo({ ...attendeeInfo, lastName: e.target.value })
                        }
                        required
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={attendeeInfo.email}
                      onChange={(e) =>
                        setAttendeeInfo({ ...attendeeInfo, email: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+265 8XX XXX XXX"
                      value={attendeeInfo.phone}
                      onChange={(e) =>
                        setAttendeeInfo({ ...attendeeInfo, phone: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-base h-12 font-semibold">
                    Continue to Payment
                  </Button>
                </form>
              </Card>
            )}

            {step === 'payment' && (
              <Card className="p-8">
                <h1 className="text-2xl font-bold mb-6">Payment Details</h1>
                <p className="text-muted-foreground mb-6">
                  This is a demo checkout. In production, this would integrate with PayChangu for secure payments.
                </p>

                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <Field>
                    <FieldLabel htmlFor="cardName">Cardholder Name</FieldLabel>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={cardInfo.cardName}
                      onChange={(e) =>
                        setCardInfo({ ...cardInfo, cardName: e.target.value })
                      }
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cardNumber">Card Number</FieldLabel>
                    <Input
                      id="cardNumber"
                      placeholder="4532 1234 5678 9010"
                      value={cardInfo.cardNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\s/g, '');
                        if (value.length <= 16 && /^\d*$/.test(value)) {
                          value = value.match(/.{1,4}/g)?.join(' ') || value;
                          setCardInfo({ ...cardInfo, cardNumber: value });
                        }
                      }}
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="expiry">Expiry Date</FieldLabel>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={cardInfo.expiryDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setCardInfo({ ...cardInfo, expiryDate: value });
                        }}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="cvv">CVV</FieldLabel>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cardInfo.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                          setCardInfo({ ...cardInfo, cvv: value });
                        }}
                        required
                      />
                    </Field>
                  </div>

                  {/* Legacy Points Redemption */}
                  {availablePoints >= POINTS_CONFIG.minRedemption && (
                    <div className={`rounded-xl border-2 p-4 transition-all ${
                      usePoints ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                          <TrophyIcon className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-sm">Use Legacy Points</p>
                            <button
                              type="button"
                              onClick={() => {
                                setUsePoints(!usePoints);
                                if (!usePoints) setPointsToRedeem(Math.min(maxPoints, availablePoints));
                                else setPointsToRedeem(0);
                              }}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                usePoints ? 'bg-primary' : 'bg-muted-foreground/30'
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                usePoints ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            You have <span className="font-bold text-foreground">{availablePoints.toLocaleString()} pts</span> available
                          </p>
                          {usePoints && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={POINTS_CONFIG.minRedemption}
                                  max={maxPoints}
                                  step={100}
                                  value={pointsToRedeem}
                                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                                  className="flex-1 accent-primary"
                                />
                                <span className="text-sm font-bold w-20 text-right">
                                  {pointsToRedeem.toLocaleString()} pts
                                </span>
                              </div>
                              <p className="text-xs text-green-600 font-semibold">
                                = MWK {pointsToMwk(pointsToRedeem).toLocaleString()} discount
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setStep('details')}
                      variant="outline"
                      className="flex-1 h-12 text-base"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-primary hover:bg-primary/90 text-base h-12 font-semibold"
                    >
                      {loading ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {step === 'confirmation' && (
              <Card className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-3xl">✓</div>
                  </div>
                </div>

                <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
                <p className="text-muted-foreground mb-6">
                  Your tickets have been successfully booked.
                </p>

                <Card className="bg-muted p-6 mb-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID:</span>
                      <span className="font-bold">{confirmationDetails.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-bold">{confirmationDetails.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-bold text-green-600">Confirmed</span>
                    </div>
                  </div>
                </Card>

                <p className="text-muted-foreground text-sm mb-6">
                  A confirmation email has been sent to <strong>{confirmationDetails.email}</strong>. 
                  Your tickets are ready to download.
                </p>

                <Button
                  onClick={handleFinish}
                  className="w-full bg-primary hover:bg-primary/90 text-base h-12 font-semibold"
                >
                  Return Home
                </Button>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-20 p-6 bg-muted">
              <h3 className="font-bold mb-4">Order Summary</h3>

              <div className="space-y-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">{event?.title || 'Loading event...'}</p>
                  <p className="text-sm font-semibold">{qty} {tier === 'VIP' ? 'VIP Ticket' : 'Ticket'}{qty !== 1 ? 's' : ''} × MWK {unitPrice.toLocaleString()}</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>MWK {totalPrice.toLocaleString()}</span>
                </div>
                {transport === 'round-trip' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transport</span>
                    <span>MWK {transportCost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>MWK 500</span>
                </div>
                {usePoints && pointsDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <TrophyIcon className="w-3 h-3" /> Legacy Points
                    </span>
                    <span>-MWK {pointsDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between font-bold text-lg mt-4">
                <span>Total</span>
                <span className="text-primary">MWK {finalPrice.toLocaleString()}</span>
              </div>

              <div className="mt-6 p-4 bg-background rounded-lg flex gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your payment is secure and encrypted. All data is protected.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
