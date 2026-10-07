export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const HOLDER_TYPES = {
  P: 'individual',
  C: 'company',
  H: 'huf',
  F: 'firm',
  A: 'aop',
  T: 'trust',
  B: 'boi',
  L: 'local_authority',
  J: 'artificial_juridical_person',
  G: 'government',
} as const;

export type HolderType = (typeof HOLDER_TYPES)[keyof typeof HOLDER_TYPES];

export const HOLDER_TYPE_VALUES = Object.values(HOLDER_TYPES);