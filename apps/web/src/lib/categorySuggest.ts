/**
 * Guess leaf (final) budget categories for imports and repair group-level tags.
 */

import { getLeafCategories, isParentCategory } from './categories'

type CategoryLike = {
  id: string
  name: string
  parentId?: string | null
  type?: string
  sortOrder?: number
  emoji?: string
}

const PLAID_PRIMARY_TO_LEAF: Record<string, string[]> = {
  food_and_drink: ['Dining', 'Coffee', 'Groceries'],
  restaurants: ['Dining'],
  coffee: ['Coffee'],
  groceries: ['Groceries'],
  transportation: ['Transit', 'Gas'],
  travel: ['Transit', 'Vacation'],
  general_merchandise: ['Clothes', 'Household', 'Shopping'],
  merchandise: ['Clothes', 'Household'],
  entertainment: ['Movies & Events', 'Games'],
  recreation: ['Movies & Events', 'Games'],
  rent_and_utilities: ['Rent & Housing', 'Utilities', 'Internet'],
  rent: ['Rent & Housing'],
  utilities: ['Utilities', 'Internet'],
  transfer_in: ['Salary'],
  transfer_out: ['Household'],
  loan_payments: ['Plaid Credit Card'],
  bank_fees: ['Household'],
  interest: ['Salary'],
  income: ['Salary'],
  paycheck: ['Salary'],
}

const PAYEE_KEYWORD_LEAVES: Array<{ re: RegExp; names: string[] }> = [
  { re: /starbucks|dunkin|coffee|cafe|espresso/i, names: ['Coffee'] },
  { re: /mcdonald|kfc|wendy|chipotle|restaurant|dining|doordash|ubereats|grubhub/i, names: ['Dining'] },
  { re: /whole\s*foods|trader\s*joe|grocery|safeway|kroger|costco|walmart/i, names: ['Groceries'] },
  { re: /\buber\b|\blyft\b|transit|metro|amtrak/i, names: ['Transit'] },
  { re: /shell|chevron|exxon|gas\b|fuel|bp\b/i, names: ['Gas'] },
  { re: /netflix|hulu|spotify|disney\+|youtube\s*premium/i, names: ['Streaming'] },
  { re: /united|delta|american airlines|airline|airfare/i, names: ['Vacation', 'Transit'] },
  { re: /climbing|gym|fitness/i, names: ['Games', 'Movies & Events'] },
  { re: /bicycle|bike/i, names: ['Transit', 'Household'] },
  { re: /interest|intrst/i, names: ['Salary'] },
  { re: /payroll|direct dep|salary|paycheck/i, names: ['Salary'] },
]

function byNameMap(categories: CategoryLike[]) {
  const map = new Map<string, CategoryLike>()
  for (const c of categories || []) {
    map.set(String(c.name || '').toLowerCase(), c)
  }
  return map
}

function firstLeafUnder(categories: CategoryLike[], categoryId: string): string | null {
  if (!categoryId) return null
  if (!isParentCategory(categories, categoryId)) return categoryId
  const children = categories
    .filter((c) => c.parentId === categoryId)
    .sort(
      (a, b) =>
        (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name)
    )
  for (const child of children) {
    const leaf = firstLeafUnder(categories, child.id)
    if (leaf) return leaf
  }
  return null
}

/** If id is a group/parent, descend to a leaf; leaves pass through. */
export function resolveToLeafCategoryId(
  categories: CategoryLike[],
  categoryId: string | null | undefined
): string | null {
  if (!categoryId) return null
  const exists = (categories || []).some((c) => c.id === categoryId)
  if (!exists) return null
  return firstLeafUnder(categories, categoryId)
}

function pickLeafByNames(categories: CategoryLike[], names: string[]) {
  const map = byNameMap(categories)
  const leaves = new Set(getLeafCategories(categories).map((c: CategoryLike) => c.id))
  for (const name of names || []) {
    const cat = map.get(String(name).toLowerCase())
    if (!cat) continue
    if (leaves.has(cat.id)) return cat.id
    const leaf = firstLeafUnder(categories, cat.id)
    if (leaf) return leaf
  }
  return null
}

/**
 * Guess a leaf category from Plaid PFC + payee text + optional payee rule.
 */
export function suggestLeafCategoryId({
  categories,
  payee = '',
  merchant = '',
  plaidPrimary = '',
  plaidDetailed = '',
  ruleCategoryId = null,
}: {
  categories: CategoryLike[]
  payee?: string
  merchant?: string
  plaidPrimary?: string
  plaidDetailed?: string
  ruleCategoryId?: string | null
}): string | null {
  if (ruleCategoryId) {
    const fromRule = resolveToLeafCategoryId(categories, ruleCategoryId)
    if (fromRule) return fromRule
  }

  const hay = `${payee} ${merchant}`
  for (const rule of PAYEE_KEYWORD_LEAVES) {
    if (rule.re.test(hay)) {
      const id = pickLeafByNames(categories, rule.names)
      if (id) return id
    }
  }

  const detailed = String(plaidDetailed || '')
    .toLowerCase()
    .replace(/_/g, ' ')
  if (detailed) {
    const prettyParts = detailed.split(/\s+/).filter(Boolean)
    const id = pickLeafByNames(categories, [
      prettyParts.slice(-2).join(' '),
      prettyParts[prettyParts.length - 1],
    ])
    if (id) return id
  }

  const primaryKey = String(plaidPrimary || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (primaryKey && PLAID_PRIMARY_TO_LEAF[primaryKey]) {
    const id = pickLeafByNames(categories, PLAID_PRIMARY_TO_LEAF[primaryKey])
    if (id) return id
  }

  const pretty = String(plaidPrimary || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ')
  if (pretty) {
    const id = pickLeafByNames(categories, [pretty, 'Household', 'Clothes', 'Dining'])
    if (id) return id
  }

  return pickLeafByNames(categories, ['Household', 'Clothes', 'Dining', 'Transit'])
}

/** Group expense leaves under "Parent › Group" labels for <select> optgroups. */
export function leafExpenseOptgroups(categories: CategoryLike[]) {
  const leaves = getLeafCategories(categories, 'expense') as CategoryLike[]
  const byId = Object.fromEntries((categories || []).map((c) => [c.id, c]))
  const groups = new Map<string, CategoryLike[]>()

  for (const leaf of leaves) {
    const parent = leaf.parentId ? byId[leaf.parentId] : null
    const grand = parent?.parentId ? byId[parent.parentId] : null
    let label = 'Categories'
    if (grand && parent) {
      label = `${grand.emoji ? `${grand.emoji} ` : ''}${grand.name} › ${parent.emoji ? `${parent.emoji} ` : ''}${parent.name}`
    } else if (parent) {
      label = `${parent.emoji ? `${parent.emoji} ` : ''}${parent.name}`
    }
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(leaf)
  }

  return [...groups.entries()].map(([label, items]) => ({
    label,
    items: items.sort(
      (a, b) =>
        (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name)
    ),
  }))
}
