/** Normalize bank merchant text for payee rename matching. */
export function normalizePayeeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function applyPayeeRename(merchant, rulesByKey) {
  const key = normalizePayeeKey(merchant)
  const rule = rulesByKey?.[key]
  return rule?.renameTo || merchant || 'Unknown'
}
