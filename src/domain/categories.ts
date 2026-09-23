import type { ExpenseCategory, FamilyRole } from './models';

/** Presentation metadata for expense categories (spec §14). */
export interface ExpenseCategoryMeta {
  value: ExpenseCategory;
  label: string;
  labelTa: string;
  emoji: string;
  tint: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  { value: 'food', label: 'Food', labelTa: 'உணவு', emoji: '🍛', tint: '#E8912A' },
  { value: 'decoration', label: 'Decoration', labelTa: 'அலங்காரம்', emoji: '🎀', tint: '#DB2777' },
  { value: 'hall', label: 'Hall', labelTa: 'மண்டபம்', emoji: '🏛️', tint: '#2563EB' },
  { value: 'travel', label: 'Travel', labelTa: 'பயணம்', emoji: '🚌', tint: '#0891B2' },
  { value: 'photography', label: 'Photography', labelTa: 'புகைப்படம்', emoji: '📸', tint: '#9333EA' },
  { value: 'invitation', label: 'Invitation', labelTa: 'அழைப்பிதழ்', emoji: '💌', tint: '#CA8A04' },
  { value: 'clothing', label: 'Clothing', labelTa: 'ஆடை', emoji: '👗', tint: '#DB2777' },
  { value: 'music', label: 'Music', labelTa: 'இசை', emoji: '🥁', tint: '#0FA968' },
  { value: 'gifts', label: 'Gifts', labelTa: 'பரிசு', emoji: '🎁', tint: '#E23A3A' },
  { value: 'transport', label: 'Transport', labelTa: 'போக்குவரத்து', emoji: '🚚', tint: '#5A5B77' },
  { value: 'other', label: 'Other', labelTa: 'மற்றவை', emoji: '🧾', tint: '#5B21B6' },
];

const EXPENSE_BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c]));

export function expenseCategoryMeta(category: ExpenseCategory): ExpenseCategoryMeta {
  return EXPENSE_BY_VALUE.get(category) ?? EXPENSE_BY_VALUE.get('other')!;
}

/** Family roles, with the permissions each one implies (spec §16). */
export interface RoleMeta {
  value: FamilyRole;
  label: string;
  description: string;
}

export const FAMILY_ROLES: RoleMeta[] = [
  { value: 'owner', label: 'Owner', description: 'Full control, including family management' },
  { value: 'admin', label: 'Admin', description: 'Everything except removing the owner' },
  { value: 'editor', label: 'Editor', description: 'Add and edit functions, moi and expenses' },
  { value: 'viewer', label: 'Viewer', description: 'Can only view records and reports' },
];

export function roleMeta(role: FamilyRole): RoleMeta {
  return FAMILY_ROLES.find((r) => r.value === role) ?? FAMILY_ROLES[3];
}

/** The granular permissions the app checks (spec §16). */
export type Permission =
  | 'functions.view' | 'functions.edit'
  | 'moi.view' | 'moi.edit' | 'moi.delete'
  | 'expenses.view' | 'expenses.edit'
  | 'reports.view'
  | 'family.manage';

const ROLE_PERMISSIONS: Record<FamilyRole, Permission[]> = {
  owner: [
    'functions.view', 'functions.edit', 'moi.view', 'moi.edit', 'moi.delete',
    'expenses.view', 'expenses.edit', 'reports.view', 'family.manage',
  ],
  admin: [
    'functions.view', 'functions.edit', 'moi.view', 'moi.edit', 'moi.delete',
    'expenses.view', 'expenses.edit', 'reports.view', 'family.manage',
  ],
  editor: [
    'functions.view', 'functions.edit', 'moi.view', 'moi.edit',
    'expenses.view', 'expenses.edit', 'reports.view',
  ],
  viewer: ['functions.view', 'moi.view', 'expenses.view', 'reports.view'],
};

export function roleCan(role: FamilyRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
