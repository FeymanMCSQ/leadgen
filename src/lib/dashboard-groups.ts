import { LeadStatus } from '@prisma/client';

export type DashboardGroup = 'todo' | 'potential' | 'inProgress' | 'approved' | 'declined';

export const GROUP_TO_STATUSES: Record<DashboardGroup, LeadStatus[]> = {
  todo:       ['TODO'],
  potential:  ['POTENTIAL_RESEARCH'],
  inProgress: ['PENDING', 'CONTACTED'],
  approved:   ['SUCCEEDED'],
  declined:   ['DEAD_END', 'DISCARDED', 'DO_NOT_CALL'],
};

export const STATUS_TO_GROUP: Record<LeadStatus, DashboardGroup> = {
  TODO:                 'todo',
  POTENTIAL_RESEARCH:   'potential',
  PENDING:              'inProgress',
  CONTACTED:            'inProgress',
  SUCCEEDED:            'approved',
  DEAD_END:             'declined',
  DISCARDED:            'declined',
  DO_NOT_CALL:          'declined',
};

export const VALID_GROUPS = Object.keys(GROUP_TO_STATUSES) as DashboardGroup[];
