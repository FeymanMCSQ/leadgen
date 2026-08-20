export type DashboardGroup = 'todo' | 'potential' | 'inProgress' | 'approved' | 'declined';
export type DashboardSort = 'uncalledFirst' | 'addedOldest' | 'addedNewest' | 'score';
export type DashboardGrouping = 'none' | 'callStatus';

export interface DashboardSummary {
  quota: number;
  completedToday: number;
  remainingToday: number;
  timezone: string;
  localDate: string;
  countsByGroup: {
    todo: number;
    potential: number;
    inProgress: number;
    approved: number;
    declined: number;
  };
}

export interface LeadRow {
  id: string;
  name: string;
  leadStatus: string;
  primaryType?: string;
  categoryBucket?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  leadScore: number;
  notes?: string;
  formattedAddress?: string;
  createdAt: string;
  callCount: number;
  lastCalledAt?: string | null;
  lastCallOutcome?: string | null;
}

export const SORT_OPTIONS: { value: DashboardSort; label: string }[] = [
  { value: 'uncalledFirst', label: 'Uncalled first' },
  { value: 'addedOldest', label: 'Added oldest' },
  { value: 'addedNewest', label: 'Added newest' },
  { value: 'score', label: 'Highest score' },
];

export const GROUPING_OPTIONS: { value: DashboardGrouping; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'callStatus', label: 'Group by call status' },
];

export const GROUP_LABELS: Record<DashboardGroup, string> = {
  todo: 'To Do',
  potential: 'Potential',
  inProgress: 'In Progress',
  approved: 'Approved',
  declined: 'Declined',
};

export const GROUP_EMPTY: Record<DashboardGroup, string> = {
  todo: 'No calls waiting.',
  potential: 'No research leads.',
  inProgress: 'Nothing in progress.',
  approved: 'No approved leads yet.',
  declined: 'No declined leads.',
};

// What the status dropdown shows
export const STATUS_OPTIONS = [
  { value: 'TODO',                label: 'To Do' },
  { value: 'POTENTIAL_RESEARCH',  label: 'Potential' },
  { value: 'PENDING',             label: 'In Progress' },
  { value: 'DEAD_END',            label: 'Declined' },
  { value: 'SUCCEEDED',           label: 'Approved' },
  { value: 'DO_NOT_CALL',         label: 'Do Not Call' },
];
