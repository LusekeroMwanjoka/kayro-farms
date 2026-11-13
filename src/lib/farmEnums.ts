export const MOVEMENT_TYPES = {
  opening: 'opening',
  received: 'received',
  sold: 'sold',
  used: 'used',
  lost: 'lost',
  adjustment: 'adjustment',
} as const;

export const PAYMENT_TYPES = {
  cash: 'cash',
  credit: 'credit',
  partPaid: 'part_paid',
} as const;

export const PAYMENT_METHODS = {
  cash: 'cash',
  mobileMoney: 'mobile_money',
  bank: 'bank',
} as const;

export const SOURCE_TYPES = {
  ownHarvest: 'own_harvest',
  supplier: 'supplier',
  purchase: 'purchase',
} as const;

export const DAY_STATUSES = {
  open: 'open',
  submitted: 'submitted',
} as const;

export const CORRECTION_STATUSES = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;
