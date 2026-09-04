'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StarIcon,
  TrophyIcon,
  GiftIcon,
  ZapIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  LockIcon,
  TicketIcon,
  Bus,
  SparklesIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  getPointTier,
  pointsToNextTier,
  TIER_COLORS,
  TIER_THRESHOLDS,
  POINT_REWARDS,
  POINTS_CONFIG,
  type PointTier,
  type PointReward,
} from '@/lib/legacy-points';

const TIER_ORDER: PointTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

const TIER_ICONS: Record<PointTier, string> = {
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Platinum: '💎',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  discount: 'Discount',
  upgrade: 'Upgrade',
  merch: 'Merch',
  experience: 'Experience',
};

export default function LegacyPointsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [redeemingReward, setRedeemingReward] = useState<string | null>(null);
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'rewards' | 'earn' | 'history'>('rewards');
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth?redirect=/legacy-points');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/points?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentPoints(data.totalPoints ?? 0);
          setLifetimePoints(data.totalPoints ?? 0);
          setBookingCount(data.bookingCount ?? 0);
          setPointsHistory(data.history ?? []);
        } else {
          setCurrentPoints(0);
          setLifetimePoints(0);
          setBookingCount(0);
          setPointsHistory([]);
        }
      } catch {
        setCurrentPoints(0);
        setLifetimePoints(0);
        setBookingCount(0);
        setPointsHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  const tier = getPointTier(lifetimePoints);
  const { nextTier, needed, progress } = pointsToNextTier(lifetimePoints);
  const tierColor = TIER_COLORS[tier];

  const handleRedeem = (reward: PointReward) => {
    if (currentPoints < reward.pointsCost) return;
    const tierIndex = TIER_ORDER.indexOf(tier);
    const minTierIndex = TIER_ORDER.indexOf(reward.minTier);
    if (tierIndex < minTierIndex) return;

    setRedeemingReward(reward.id);
    // Simulate a redemption — in production this writes to Firestore
    setTimeout(() => {
      setCurrentPoints((p) => p - reward.pointsCost);
      setRedeemedRewards((prev) => [...prev, reward.id]);
      setRedeemingReward(null);
    }, 1200);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-primary hover:text-primary/80 font-bold uppercase tracking-widest text-xs w-fit"
      >
        <ChevronLeftIcon className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-8 text-white shadow-2xl">
        {/* decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          {/* Left */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{TIER_ICONS[tier]}</span>
              <span
                className={`text-xs font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full bg-white/15 border border-white/20`}
              >
                {tier} Member
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-1">
              {currentPoints.toLocaleString()}
            </h1>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-widest">
              Legacy Points Available
            </p>
            <p className="text-white/60 text-xs mt-2">
              {lifetimePoints.toLocaleString()} pts earned all-time · {bookingCount} booking{bookingCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Tier Progress */}
          <div className="md:w-64 bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            {nextTier ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3">
                  Progress to {TIER_ICONS[nextTier]} {nextTier}
                </p>
                <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                  <div
                    className="bg-white rounded-full h-2 transition-all duration-700"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold">
                  {needed.toLocaleString()} pts to go
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3">
                  {TIER_ICONS['Platinum']} Platinum Status
                </p>
                <p className="text-sm font-semibold">You've reached the highest tier!</p>
                <p className="text-xs text-white/60 mt-1">Enjoy exclusive perks & rewards.</p>
              </>
            )}

            {/* Tier ladder */}
            <div className="flex justify-between mt-4">
              {TIER_ORDER.map((t) => {
                const reached = TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(tier);
                return (
                  <div key={t} className="flex flex-col items-center gap-1">
                    <span className={`text-lg ${reached ? 'opacity-100' : 'opacity-30'}`}>
                      {TIER_ICONS[t]}
                    </span>
                    <span className={`text-[9px] font-bold uppercase ${reached ? 'text-white' : 'text-white/30'}`}>
                      {t}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(['rewards', 'earn', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'rewards' ? '🎁 Rewards' : tab === 'earn' ? '⚡ How to Earn' : '📋 History'}
          </button>
        ))}
      </div>

      {/* --- REWARDS TAB --- */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Redeem Your Points</h2>
            <span className="text-sm text-muted-foreground font-semibold">
              Balance: <span className="text-foreground">{currentPoints.toLocaleString()} pts</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {POINT_REWARDS.map((reward) => {
              const tierIndex = TIER_ORDER.indexOf(tier);
              const minTierIndex = TIER_ORDER.indexOf(reward.minTier);
              const tierLocked = tierIndex < minTierIndex;
              const pointsLocked = currentPoints < reward.pointsCost;
              const locked = tierLocked || pointsLocked;
              const redeemed = redeemedRewards.includes(reward.id);
              const isRedeeming = redeemingReward === reward.id;

              return (
                <Card
                  key={reward.id}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    redeemed
                      ? 'border-green-500/40 bg-green-50 dark:bg-green-950/20'
                      : locked
                      ? 'opacity-60 border-dashed'
                      : 'hover:-translate-y-1 hover:shadow-lg border-border/50'
                  }`}
                >
                  <CardContent className="p-5 flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{reward.icon}</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${
                          reward.type === 'discount'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : reward.type === 'upgrade'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : reward.type === 'merch'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}
                      >
                        {REWARD_TYPE_LABELS[reward.type]}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-black text-base leading-tight mb-1">{reward.title}</h3>
                      <p className="text-xs text-muted-foreground leading-snug">{reward.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <span className="text-lg font-black text-primary">
                          {reward.pointsCost.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </div>
                      {tierLocked && (
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                          <LockIcon className="w-3 h-3" /> {reward.minTier}+
                        </span>
                      )}
                    </div>

                    {redeemed ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                        <CheckCircleIcon className="w-4 h-4" /> Redeemed!
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={locked || isRedeeming}
                        onClick={() => handleRedeem(reward)}
                        className={`w-full font-bold transition-all ${
                          locked
                            ? 'cursor-not-allowed'
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                      >
                        {isRedeeming ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                            Redeeming…
                          </span>
                        ) : locked ? (
                          tierLocked ? `Requires ${reward.minTier}` : 'Not enough points'
                        ) : (
                          'Redeem'
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* --- EARN TAB --- */}
      {activeTab === 'earn' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight">Ways to Earn Legacy Points</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: <TicketIcon className="w-6 h-6" />,
                title: 'Buy Tickets',
                description: `Earn 1 point for every MWK 10 spent. Buy a MWK 5,000 ticket → 500 pts.`,
                color: 'bg-primary/10 text-primary',
                pts: '1 pt / MWK 10',
              },
              {
                icon: <StarIcon className="w-6 h-6" />,
                title: 'Go VIP',
                description: `Upgrade to a VIP ticket to earn a bonus ${POINTS_CONFIG.vipBonus} points on top of your base earn.`,
                color: 'bg-yellow-500/10 text-yellow-600',
                pts: `+${POINTS_CONFIG.vipBonus} pts`,
              },
              {
                icon: <Bus className="w-6 h-6" />,
                title: 'Add Bus Transport',
                description: `Book the round-trip bus add-on and pick up an extra ${POINTS_CONFIG.transportBonus} points.`,
                color: 'bg-green-500/10 text-green-600',
                pts: `+${POINTS_CONFIG.transportBonus} pts`,
              },
              {
                icon: <SparklesIcon className="w-6 h-6" />,
                title: 'Welcome Bonus',
                description: `First-ever booking on Zosavuta rewards you with a ${POINTS_CONFIG.welcomeBonus} points welcome gift.`,
                color: 'bg-purple-500/10 text-purple-600',
                pts: `+${POINTS_CONFIG.welcomeBonus} pts`,
              },
            ].map((item) => (
              <Card key={item.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-black text-base">{item.title}</h3>
                      <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                        {item.pts}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tier benefits */}
          <h2 className="text-2xl font-black tracking-tight pt-4">Tier Benefits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIER_ORDER.map((t) => {
              const colors = TIER_COLORS[t];
              const isCurrentTier = t === tier;
              return (
                <Card
                  key={t}
                  className={`border-2 transition-all ${colors.border} ${isCurrentTier ? 'shadow-lg' : ''}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{TIER_ICONS[t]}</span>
                      <span className={`font-black text-sm ${colors.text}`}>{t}</span>
                      {isCurrentTier && (
                        <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-bold ${colors.text} mb-3`}>
                      {TIER_THRESHOLDS[t].toLocaleString()}+ pts lifetime
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {t === 'Bronze' && (
                        <>
                          <li>✓ Base point earning</li>
                          <li>✓ Ticket discounts</li>
                        </>
                      )}
                      {t === 'Silver' && (
                        <>
                          <li>✓ All Bronze perks</li>
                          <li>✓ Bus transport upgrade</li>
                          <li>✓ VIP upgrades</li>
                        </>
                      )}
                      {t === 'Gold' && (
                        <>
                          <li>✓ All Silver perks</li>
                          <li>✓ Merch rewards</li>
                          <li>✓ Priority support</li>
                        </>
                      )}
                      {t === 'Platinum' && (
                        <>
                          <li>✓ All Gold perks</li>
                          <li>✓ Backstage passes</li>
                          <li>✓ Exclusive events</li>
                        </>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* --- HISTORY TAB --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight">Points History</h2>
          <Card className="border-none shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {pointsHistory.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No points history yet. Book your first event to start earning!</p>
                </div>
              ) : (
                pointsHistory.map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      entry.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {entry.type === 'earned' ? (
                        <TicketIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <GiftIcon className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{entry.description || (entry.type === 'earned' ? 'Points earned' : 'Points redeemed')}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black ${entry.type === 'earned' ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.type === 'earned' ? '+' : '-'}{entry.points.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                ))
              )}

              {redeemedRewards.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Redemptions</p>
                  </div>
                  {redeemedRewards.map((rid) => {
                    const reward = POINT_REWARDS.find((r) => r.id === rid);
                    if (!reward) return null;
                    return (
                      <div key={rid} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 text-xl">
                          {reward.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{reward.title}</p>
                          <p className="text-xs text-muted-foreground">Redeemed just now</p>
                        </div>
                        <p className="font-black text-red-500 shrink-0">
                          -{reward.pointsCost.toLocaleString()} pts
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/10">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="font-black text-lg">Earn more Legacy Points</h3>
            <p className="text-sm text-muted-foreground">
              Browse upcoming events and start stacking points toward your next tier.
            </p>
          </div>
          <Link href="/events">
            <Button className="gap-2 font-bold">
              <TicketIcon className="w-4 h-4" /> Explore Events
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
