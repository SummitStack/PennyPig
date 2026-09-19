/** Android-style emoji catalog for category picking (budget-relevant + common). */

export const EMOJI_CATEGORIES = [
  {
    id: 'recent',
    label: 'Recent',
    icon: '🕒',
    emojis: [], // filled at runtime from localStorage
  },
  {
    id: 'money',
    label: 'Money',
    icon: '💰',
    emojis: [
      { e: '💰', n: 'money bag' },
      { e: '💵', n: 'dollar' },
      { e: '💸', n: 'money with wings' },
      { e: '💳', n: 'credit card' },
      { e: '🏦', n: 'bank' },
      { e: '🏧', n: 'atm' },
      { e: '📊', n: 'chart' },
      { e: '📈', n: 'chart up' },
      { e: '📉', n: 'chart down' },
      { e: '🧾', n: 'receipt' },
      { e: '💎', n: 'gem' },
      { e: '🪙', n: 'coin' },
      { e: '🤑', n: 'money face' },
      { e: '💼', n: 'briefcase' },
      { e: '🗂️', n: 'dividers' },
      { e: '📁', n: 'folder' },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    emojis: [
      { e: '🏠', n: 'house' },
      { e: '🏡', n: 'home garden' },
      { e: '🏢', n: 'office' },
      { e: '🏗️', n: 'construction' },
      { e: '🔑', n: 'key' },
      { e: '🛋️', n: 'couch' },
      { e: '🛏️', n: 'bed' },
      { e: '🚿', n: 'shower' },
      { e: '🧹', n: 'broom' },
      { e: '🧺', n: 'basket' },
      { e: '💡', n: 'bulb' },
      { e: '🔌', n: 'plug' },
      { e: '📶', n: 'wifi' },
      { e: '🛠️', n: 'tools' },
      { e: '🔧', n: 'wrench' },
      { e: '🪴', n: 'plant' },
      { e: '🌿', n: 'herb' },
      { e: '🐶', n: 'dog' },
      { e: '🐱', n: 'cat' },
      { e: '🧸', n: 'teddy' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    icon: '🍽️',
    emojis: [
      { e: '🍽️', n: 'dining' },
      { e: '🛒', n: 'cart groceries' },
      { e: '🍝', n: 'pasta' },
      { e: '🍕', n: 'pizza' },
      { e: '🍔', n: 'burger' },
      { e: '🍟', n: 'fries' },
      { e: '🌮', n: 'taco' },
      { e: '🍣', n: 'sushi' },
      { e: '🥗', n: 'salad' },
      { e: '🥪', n: 'sandwich' },
      { e: '🍜', n: 'noodles' },
      { e: '☕', n: 'coffee' },
      { e: '🧃', n: 'juice' },
      { e: '🍺', n: 'beer' },
      { e: '🍷', n: 'wine' },
      { e: '🍦', n: 'ice cream' },
      { e: '🍩', n: 'donut' },
      { e: '🍎', n: 'apple' },
      { e: '🥑', n: 'avocado' },
      { e: '🥖', n: 'bread' },
    ],
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: '🚗',
    emojis: [
      { e: '🚗', n: 'car' },
      { e: '🚕', n: 'taxi' },
      { e: '🚌', n: 'bus' },
      { e: '🚇', n: 'metro' },
      { e: '🚂', n: 'train' },
      { e: '✈️', n: 'plane' },
      { e: '🛫', n: 'departure' },
      { e: '⛽', n: 'gas fuel' },
      { e: '🅿️', n: 'parking' },
      { e: '🚲', n: 'bike' },
      { e: '🛵', n: 'scooter' },
      { e: '🚢', n: 'ship' },
      { e: '🏨', n: 'hotel' },
      { e: '🗺️', n: 'map' },
      { e: '🧳', n: 'luggage' },
      { e: '⛱️', n: 'beach' },
      { e: '🏔️', n: 'mountain' },
      { e: '🌍', n: 'globe' },
    ],
  },
  {
    id: 'fun',
    label: 'Fun',
    icon: '🎬',
    emojis: [
      { e: '🎬', n: 'movie' },
      { e: '🎟️', n: 'ticket' },
      { e: '🎮', n: 'games' },
      { e: '🕹️', n: 'joystick' },
      { e: '🎵', n: 'music' },
      { e: '🎧', n: 'headphones' },
      { e: '📺', n: 'tv' },
      { e: '📱', n: 'phone' },
      { e: '💻', n: 'laptop' },
      { e: '🛍️', n: 'shopping' },
      { e: '👕', n: 'shirt' },
      { e: '👗', n: 'dress' },
      { e: '👟', n: 'shoes' },
      { e: '💄', n: 'makeup' },
      { e: '💇', n: 'haircut' },
      { e: '🏋️', n: 'gym' },
      { e: '⚽', n: 'soccer' },
      { e: '🏀', n: 'basketball' },
      { e: '🎯', n: 'target' },
      { e: '🎁', n: 'gift' },
      { e: '🎉', n: 'party' },
      { e: '📚', n: 'books' },
      { e: '🎨', n: 'art' },
    ],
  },
  {
    id: 'health',
    label: 'Life',
    icon: '🏥',
    emojis: [
      { e: '🏥', n: 'hospital' },
      { e: '💊', n: 'medicine' },
      { e: '🩺', n: 'stethoscope' },
      { e: '🦷', n: 'tooth' },
      { e: '👁️', n: 'eye' },
      { e: '🧴', n: 'lotion' },
      { e: '🎓', n: 'graduation' },
      { e: '👶', n: 'baby' },
      { e: '🍼', n: 'bottle' },
      { e: '❤️', n: 'heart' },
      { e: '🛟', n: 'lifebuoy emergency' },
      { e: '🛡️', n: 'shield insurance' },
      { e: '⚖️', n: 'scales legal' },
      { e: '📋', n: 'clipboard' },
      { e: '⭐', n: 'star' },
      { e: '🔥', n: 'fire' },
      { e: '✨', n: 'sparkles' },
      { e: '✅', n: 'check' },
    ],
  },
]

const RECENT_KEY = 'pennypig.emoji.recent'
const MAX_RECENT = 24

export function getRecentEmojis() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function pushRecentEmoji(emoji) {
  try {
    const next = [emoji, ...getRecentEmojis().filter((e) => e !== emoji)].slice(
      0,
      MAX_RECENT
    )
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore quota / private mode
  }
}

/** Flat list kept for any callers that only need a quick set. */
export const CATEGORY_EMOJIS = EMOJI_CATEGORIES.filter((c) => c.id !== 'recent').flatMap(
  (c) => c.emojis.map((x) => x.e)
)

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
