/**
 * Canonical budget hierarchy labels (seed / locked structure).
 * Used for add-category dropdowns and suggestions.
 */

export const BUDGET_PARENT_OPTIONS = [
  'Needs',
  'Wants',
  'Savings Goals',
  'Other',
]

/** parent name → default groups (empty = categories hang directly under parent) */
export const DEFAULT_GROUPS_BY_PARENT = {
  Needs: ['Living', 'Transportation', 'Subscriptions'],
  Wants: ['Food & Dining', 'Entertainment', 'Shopping'],
  'Savings Goals': [],
  Other: ['Credit Card Payments'],
}

/** group (or parent for savings) → default leaf category names */
export const DEFAULT_LEAVES_BY_GROUP = {
  Living: ['Rent & Housing', 'Utilities', 'Internet'],
  Transportation: ['Gas', 'Transit'],
  Subscriptions: ['Streaming', 'Software'],
  'Food & Dining': ['Groceries', 'Dining', 'Coffee'],
  Entertainment: ['Movies & Events', 'Games'],
  Shopping: ['Clothes', 'Household'],
  'Credit Card Payments': [],
  'Savings Goals': ['Emergency Fund', 'Vacation'],
}

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Interest',
  'Other Income',
]

/** Sentinel parentId for the Income “group” in the add-category form. */
export const INCOME_GROUP_SENTINEL = '__income__'

export function suggestedGroupsForParent(parentName) {
  if (!parentName) return []
  return DEFAULT_GROUPS_BY_PARENT[parentName] || []
}

export function suggestedLeavesForGroupName(groupName) {
  if (!groupName) return []
  if (groupName === 'Income' || groupName === INCOME_GROUP_SENTINEL) {
    return [...DEFAULT_INCOME_CATEGORIES]
  }
  return DEFAULT_LEAVES_BY_GROUP[groupName] || []
}

export function suggestedLeavesForParent(categories, parentId) {
  if (!parentId) return []
  if (parentId === INCOME_GROUP_SENTINEL) return [...DEFAULT_INCOME_CATEGORIES]
  const parent = categories.find((c) => c.id === parentId)
  if (!parent) return []
  if (parent.type === 'income') return [...DEFAULT_INCOME_CATEGORIES]
  if (parent.name === 'Savings Goals') {
    return DEFAULT_LEAVES_BY_GROUP['Savings Goals'] || []
  }
  return DEFAULT_LEAVES_BY_GROUP[parent.name] || []
}
