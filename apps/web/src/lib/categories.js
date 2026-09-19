export const CATEGORY_EMOJIS = [
  '🏠', '🏡', '💡', '📶', '🍽️', '🛒', '🍝', '☕',
  '🚗', '⛽', '🚌', '🎬', '🎮', '🛍️', '📱', '📺',
  '🎯', '🛟', '✈️', '💰', '💸', '🏦', '💳', '📦',
  '🏥', '🎓', '🐶', '🎁', '🧾', '🛠️', '🧹', '👕',
  '💇', '🏋️', '📚', '🧸', '🌿', '🔧', '📁', '⭐',
  '🎟️', '💻', '🍕', '🎵', '🧃', '🧴', '🧸', '🪴',
]

export function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#10b981',
    type: row.type || 'expense',
    emoji: row.icon || '📁',
    parentId: row.parent_id || null,
    custom: Boolean(row.custom),
    sortOrder: row.sort_order ?? 0,
  }
}

/** Top-level categories (groups or standalone leaves). */
export function getRootCategories(categories) {
  return categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function getChildCategories(categories, parentId) {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function isParentCategory(categories, categoryId) {
  return categories.some((c) => c.parentId === categoryId)
}

/** Leaves only — budgetable rows (not groups that have children). */
export function getLeafCategories(categories, type = 'expense') {
  return categories.filter((c) => {
    if (type && c.type !== type) return false
    return !isParentCategory(categories, c.id)
  })
}

export function buildCategoryTree(categories, type = 'expense') {
  const roots = getRootCategories(categories).filter((c) => !type || c.type === type)
  return roots.map((root) => ({
    ...root,
    children: getChildCategories(categories, root.id).filter(
      (c) => !type || c.type === type
    ),
  }))
}
