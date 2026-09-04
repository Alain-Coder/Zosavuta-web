/**
 * Zosavuta – Legacy Points System
 *
 * Earning rules:
 *   • 1 point per MWK 10 spent on tickets           (10% earn rate)
 *   • 50 bonus points when attending a VIP tier event
 *   • 20 bonus points for using bus transport add-on
 *   • 200 welcome points on first booking
 *
 * Redemption rules:
 *   • 100 points = MWK 100 discount (1:1 MWK value)
 *   • Minimum redemption: 500 points
 *   • Maximum redemption per order: 30% of order total (in points)
 *
 * Tiers:
 *   • Bronze  :     0 – 999  pts (lifetime)
 *   • Silver  : 1 000 – 4 999 pts
 *   • Gold    : 5 000 – 9 999 pts
 *   • Platinum: 10 000+       pts
 */

export type PointTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LegacyPointsConfig {
  pointsPerMwk: number;         // points earned per MWK spent
  mwkPerPoint: number;          // how many MWK one point is worth when redeeming
  minRedemption: number;        // minimum points needed to redeem
  maxRedemptionRatio: number;   // max fraction of order total redeemable
  vipBonus: number;             // bonus points for VIP ticket
  transportBonus: number;       // bonus points for bus transport
  welcomeBonus: number;         // first-booking welcome bonus
}

export const POINTS_CONFIG: LegacyPointsConfig = {
  pointsPerMwk: 1 / 10,         // 1 pt per MWK 10
  mwkPerPoint: 1,               // 1 pt = MWK 1
  minRedemption: 500,
  maxRedemptionRatio: 0.30,
  vipBonus: 50,
  transportBonus: 20,
  welcomeBonus: 200,
};

export interface BookingForPoints {
  totalAmount: number;
  tier?: string;
  busTransport?: boolean;
  isFirstBooking?: boolean;
}

/** Calculate points earned for a single booking */
export function calculatePointsEarned(booking: BookingForPoints): number {
  let points = Math.floor(booking.totalAmount * POINTS_CONFIG.pointsPerMwk);

  if (booking.tier === 'VIP') {
    points += POINTS_CONFIG.vipBonus;
  }
  if (booking.busTransport) {
    points += POINTS_CONFIG.transportBonus;
  }
  if (booking.isFirstBooking) {
    points += POINTS_CONFIG.welcomeBonus;
  }

  return points;
}

/** Calculate total legacy points from an array of bookings */
export function calculateTotalPoints(
  bookings: BookingForPoints[],
  redeemedPoints: number = 0
): number {
  const earned = bookings.reduce((sum, b, i) => {
    return sum + calculatePointsEarned({ ...b, isFirstBooking: i === 0 });
  }, 0);
  return Math.max(0, earned - redeemedPoints);
}

/** Determine the tier based on lifetime earned points */
export function getPointTier(lifetimePoints: number): PointTier {
  if (lifetimePoints >= 10_000) return 'Platinum';
  if (lifetimePoints >= 5_000) return 'Gold';
  if (lifetimePoints >= 1_000) return 'Silver';
  return 'Bronze';
}

export const TIER_COLORS: Record<PointTier, { bg: string; text: string; border: string }> = {
  Bronze:   { bg: 'bg-amber-800/10',    text: 'text-amber-700',   border: 'border-amber-700/30' },
  Silver:   { bg: 'bg-slate-400/10',    text: 'text-slate-500',   border: 'border-slate-500/30' },
  Gold:     { bg: 'bg-yellow-400/10',   text: 'text-yellow-600',  border: 'border-yellow-500/30' },
  Platinum: { bg: 'bg-violet-500/10',   text: 'text-violet-600',  border: 'border-violet-500/30' },
};

export const TIER_THRESHOLDS: Record<PointTier, number> = {
  Bronze:   0,
  Silver:   1_000,
  Gold:     5_000,
  Platinum: 10_000,
};

/** Points required to reach the next tier */
export function pointsToNextTier(currentLifetimePoints: number): { nextTier: PointTier | null; needed: number; progress: number } {
  if (currentLifetimePoints >= 10_000) {
    return { nextTier: null, needed: 0, progress: 100 };
  }
  if (currentLifetimePoints >= 5_000) {
    const needed = 10_000 - currentLifetimePoints;
    return { nextTier: 'Platinum', needed, progress: ((currentLifetimePoints - 5_000) / 5_000) * 100 };
  }
  if (currentLifetimePoints >= 1_000) {
    const needed = 5_000 - currentLifetimePoints;
    return { nextTier: 'Gold', needed, progress: ((currentLifetimePoints - 1_000) / 4_000) * 100 };
  }
  const needed = 1_000 - currentLifetimePoints;
  return { nextTier: 'Silver', needed, progress: (currentLifetimePoints / 1_000) * 100 };
}

/** Convert points to MWK discount value */
export function pointsToMwk(points: number): number {
  return points * POINTS_CONFIG.mwkPerPoint;
}

/** Max redeemable points for a given order total */
export function maxRedeemablePoints(orderTotal: number, availablePoints: number): number {
  const maxByRatio = Math.floor(orderTotal * POINTS_CONFIG.maxRedemptionRatio);
  return Math.min(availablePoints, maxByRatio);
}

/** Validate a redemption request */
export function validateRedemption(
  pointsToRedeem: number,
  availablePoints: number,
  orderTotal: number
): { valid: boolean; error?: string; discountMwk: number } {
  if (pointsToRedeem < POINTS_CONFIG.minRedemption) {
    return {
      valid: false,
      error: `Minimum redemption is ${POINTS_CONFIG.minRedemption} points`,
      discountMwk: 0,
    };
  }
  if (pointsToRedeem > availablePoints) {
    return { valid: false, error: 'Insufficient Legacy Points', discountMwk: 0 };
  }
  const maxPoints = maxRedeemablePoints(orderTotal, availablePoints);
  if (pointsToRedeem > maxPoints) {
    return {
      valid: false,
      error: `You can redeem at most ${maxPoints.toLocaleString()} points (30% of order total)`,
      discountMwk: 0,
    };
  }
  return { valid: true, discountMwk: pointsToMwk(pointsToRedeem) };
}

/** Reward catalogue – what users can spend points on */
export interface PointReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'upgrade' | 'merch' | 'experience';
  icon: string;
  minTier: PointTier;
}

export const POINT_REWARDS: PointReward[] = [
  {
    id: 'r1',
    title: 'MWK 500 Ticket Discount',
    description: 'Get MWK 500 off your next ticket purchase',
    pointsCost: 500,
    type: 'discount',
    icon: '🎟️',
    minTier: 'Bronze',
  },
  {
    id: 'r2',
    title: 'MWK 1,500 Ticket Discount',
    description: 'Save MWK 1,500 on any event ticket',
    pointsCost: 1_500,
    type: 'discount',
    icon: '💸',
    minTier: 'Bronze',
  },
  {
    id: 'r3',
    title: 'Free Bus Transport',
    description: 'Redeem for a complimentary round-trip bus upgrade on any event',
    pointsCost: 1_500,
    type: 'upgrade',
    icon: '🚌',
    minTier: 'Silver',
  },
  {
    id: 'r4',
    title: 'VIP Ticket Upgrade',
    description: 'Upgrade one ticket to VIP tier for free',
    pointsCost: 3_000,
    type: 'upgrade',
    icon: '⭐',
    minTier: 'Silver',
  },
  {
    id: 'r5',
    title: 'Zosavuta Merch Bundle',
    description: 'Exclusive branded t-shirt and cap delivered to your door',
    pointsCost: 5_000,
    type: 'merch',
    icon: '👕',
    minTier: 'Gold',
  },
  {
    id: 'r6',
    title: 'Backstage Experience Pass',
    description: 'Exclusive backstage access at a partner music event',
    pointsCost: 10_000,
    type: 'experience',
    icon: '🎤',
    minTier: 'Platinum',
  },
];
