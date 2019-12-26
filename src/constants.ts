export const MD = "md";
export const PLANT_HEAD = "phead";
export const ACCOUNTS = "accounts";
export const SHIFT_IN_CHARGE = "shift";
export const SCANNER = "scanner";
export const STAFF = "staff";

export const roles = [
  MD,
  PLANT_HEAD,
  ACCOUNTS,
  SHIFT_IN_CHARGE,
  SCANNER,
  STAFF
];

export interface TimeRange {
  hours: number;
  minutes: number;
}

export const morningRange: Array<TimeRange> = [
  { hours: 8, minutes: 0 },
  { hours: 9, minutes: 0 }
];

export const eveningRange: Array<TimeRange> = [
  { hours: 17, minutes: 0 },
  { hours: 18, minutes: 0 }
];

export const nightRange: Array<TimeRange> = [
  { hours: 22, minutes: 0 },
  { hours: 23, minutes: 0 }
];
