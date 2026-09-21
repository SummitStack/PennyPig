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
      { e: '💰', n: 'money bag cash savings' },
      { e: '💵', n: 'dollar bills' },
      { e: '💴', n: 'yen' },
      { e: '💶', n: 'euro' },
      { e: '💷', n: 'pound' },
      { e: '💸', n: 'money with wings spending' },
      { e: '💳', n: 'credit card payments' },
      { e: '🏦', n: 'bank' },
      { e: '🏧', n: 'atm cash' },
      { e: '📊', n: 'chart report' },
      { e: '📈', n: 'chart up invest growth' },
      { e: '📉', n: 'chart down loss' },
      { e: '🧾', n: 'receipt taxes bill' },
      { e: '💎', n: 'gem luxury' },
      { e: '🪙', n: 'coin' },
      { e: '🤑', n: 'money face' },
      { e: '💼', n: 'briefcase work salary' },
      { e: '🗂️', n: 'dividers files' },
      { e: '📁', n: 'folder category' },
      { e: '🧮', n: 'abacus budget calculate' },
      { e: '🔏', n: 'lock with pen security' },
      { e: '🏷️', n: 'label tag' },
      { e: '🔖', n: 'bookmark' },
      { e: '📦', n: 'package box other' },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    emojis: [
      { e: '🏠', n: 'house home rent housing' },
      { e: '🏡', n: 'home garden' },
      { e: '🏢', n: 'office building' },
      { e: '🏗️', n: 'construction remodel' },
      { e: '🔑', n: 'key rent deposit' },
      { e: '🛋️', n: 'couch furniture' },
      { e: '🛏️', n: 'bed furniture' },
      { e: '🚿', n: 'shower bathroom' },
      { e: '🚽', n: 'toilet bathroom plumbing' },
      { e: '🧹', n: 'broom cleaning household' },
      { e: '🧺', n: 'basket laundry' },
      { e: '🧼', n: 'soap cleaning' },
      { e: '🧽', n: 'sponge cleaning' },
      { e: '💡', n: 'bulb utilities electric' },
      { e: '🔌', n: 'plug utilities power' },
      { e: '🔋', n: 'battery' },
      { e: '📶', n: 'wifi internet' },
      { e: '📡', n: 'satellite cable' },
      { e: '🛠️', n: 'tools repairs maintenance' },
      { e: '🔧', n: 'wrench repair' },
      { e: '🪛', n: 'screwdriver repair' },
      { e: '🪚', n: 'saw diy' },
      { e: '🪴', n: 'plant garden' },
      { e: '🌿', n: 'herb plants' },
      { e: '🌳', n: 'tree yard landscaping' },
      { e: '🐶', n: 'dog pet' },
      { e: '🐱', n: 'cat pet' },
      { e: '🐾', n: 'paws pet care' },
      { e: '🧸', n: 'teddy kids toys' },
      { e: '🪞', n: 'mirror decor' },
      { e: '🖼️', n: 'framed picture decor' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    icon: '🍽️',
    emojis: [
      { e: '🍽️', n: 'dining restaurant' },
      { e: '🛒', n: 'cart groceries shopping' },
      { e: '🏪', n: 'convenience store' },
      { e: '🍝', n: 'pasta dining' },
      { e: '🍕', n: 'pizza' },
      { e: '🍔', n: 'burger fast food' },
      { e: '🍟', n: 'fries' },
      { e: '🌮', n: 'taco' },
      { e: '🍣', n: 'sushi' },
      { e: '🥗', n: 'salad healthy' },
      { e: '🥪', n: 'sandwich lunch' },
      { e: '🍜', n: 'noodles soup' },
      { e: '🍲', n: 'pot of food meal prep' },
      { e: '🍱', n: 'bento takeout' },
      { e: '☕', n: 'coffee cafe' },
      { e: '🫖', n: 'teapot tea' },
      { e: '🧃', n: 'juice drink' },
      { e: '🧋', n: 'bubble tea' },
      { e: '🍺', n: 'beer alcohol' },
      { e: '🍷', n: 'wine alcohol' },
      { e: '🍸', n: 'cocktail bars' },
      { e: '🍦', n: 'ice cream dessert' },
      { e: '🍩', n: 'donut dessert' },
      { e: '🍪', n: 'cookie snacks' },
      { e: '🍎', n: 'apple produce' },
      { e: '🥑', n: 'avocado produce' },
      { e: '🥖', n: 'bread bakery' },
      { e: '🧀', n: 'cheese dairy' },
      { e: '🥩', n: 'meat protein' },
      { e: '🥚', n: 'egg breakfast' },
    ],
  },
  {
    id: 'travel',
    label: 'Auto & Travel',
    icon: '🚗',
    emojis: [
      { e: '🚗', n: 'car auto vehicle' },
      { e: '🚕', n: 'taxi rideshare' },
      { e: '🚙', n: 'suv car' },
      { e: '🛻', n: 'pickup truck' },
      { e: '🚌', n: 'bus transit' },
      { e: '🚎', n: 'trolley transit' },
      { e: '🚇', n: 'metro subway transit' },
      { e: '🚂', n: 'train transit' },
      { e: '✈️', n: 'plane flight travel' },
      { e: '🛫', n: 'departure flight' },
      { e: '🛬', n: 'arrival flight' },
      { e: '⛽', n: 'gas fuel petrol' },
      { e: '🛢️', n: 'oil drum oil change' },
      { e: '🛞', n: 'tire wheel tires tyre car maintenance' },
      { e: '🅿️', n: 'parking' },
      { e: '🚔', n: 'police car ticket' },
      { e: '🚲', n: 'bike bicycle' },
      { e: '🛵', n: 'scooter motorcycle' },
      { e: '🏍️', n: 'motorcycle' },
      { e: '🚢', n: 'ship cruise ferry' },
      { e: '🏨', n: 'hotel lodging' },
      { e: '🗺️', n: 'map trip' },
      { e: '🧭', n: 'compass travel' },
      { e: '🧳', n: 'luggage travel packing' },
      { e: '⛱️', n: 'beach vacation' },
      { e: '🏔️', n: 'mountain vacation' },
      { e: '🏕️', n: 'camping' },
      { e: '🌍', n: 'globe travel international' },
      { e: '🛂', n: 'passport control travel docs' },
    ],
  },
  {
    id: 'fun',
    label: 'Fun',
    icon: '🎬',
    emojis: [
      { e: '🎬', n: 'movie cinema' },
      { e: '🎟️', n: 'ticket events' },
      { e: '🎭', n: 'theater arts' },
      { e: '🎤', n: 'microphone concert karaoke' },
      { e: '🎧', n: 'headphones music streaming' },
      { e: '🎵', n: 'music' },
      { e: '🎸', n: 'guitar hobbies' },
      { e: '🎮', n: 'games gaming' },
      { e: '🕹️', n: 'joystick gaming' },
      { e: '📺', n: 'tv streaming cable' },
      { e: '📱', n: 'phone mobile cell' },
      { e: '💻', n: 'laptop software computer' },
      { e: '🖥️', n: 'desktop computer' },
      { e: '⌚', n: 'watch wearable' },
      { e: '🛍️', n: 'shopping bags wants' },
      { e: '👕', n: 'shirt clothes clothing' },
      { e: '👗', n: 'dress clothes' },
      { e: '👖', n: 'jeans clothes' },
      { e: '👟', n: 'shoes sneakers' },
      { e: '👠', n: 'heels shoes' },
      { e: '🧢', n: 'cap hat accessories' },
      { e: '💄', n: 'makeup beauty' },
      { e: '💇', n: 'haircut salon' },
      { e: '💅', n: 'nail polish salon' },
      { e: '🏋️', n: 'gym fitness' },
      { e: '🧘', n: 'yoga wellness' },
      { e: '⚽', n: 'soccer sports' },
      { e: '🏀', n: 'basketball sports' },
      { e: '🏈', n: 'football sports' },
      { e: '🎾', n: 'tennis sports' },
      { e: '⛳', n: 'golf sports' },
      { e: '🎯', n: 'target hobbies goals' },
      { e: '🎁', n: 'gift presents holidays' },
      { e: '🎉', n: 'party celebration' },
      { e: '📚', n: 'books education reading' },
      { e: '🎨', n: 'art hobbies craft' },
      { e: '📷', n: 'camera photography' },
      { e: '🪴', n: 'hobby plants' },
    ],
  },
  {
    id: 'health',
    label: 'Life',
    icon: '🏥',
    emojis: [
      { e: '🏥', n: 'hospital medical health' },
      { e: '💊', n: 'medicine pharmacy prescriptions' },
      { e: '🩺', n: 'stethoscope doctor' },
      { e: '💉', n: 'syringe vaccine shots' },
      { e: '🦷', n: 'tooth dental dentist' },
      { e: '👁️', n: 'eye vision optometry' },
      { e: '👓', n: 'glasses vision' },
      { e: '🧴', n: 'lotion personal care' },
      { e: '🩹', n: 'bandage first aid' },
      { e: '🎓', n: 'graduation education tuition' },
      { e: '🏫', n: 'school education' },
      { e: '👶', n: 'baby kids childcare' },
      { e: '🍼', n: 'bottle baby formula' },
      { e: '🧸', n: 'kids toys' },
      { e: '❤️', n: 'heart health love' },
      { e: '💍', n: 'ring wedding jewelry' },
      { e: '🛟', n: 'lifebuoy emergency fund' },
      { e: '🛡️', n: 'shield insurance' },
      { e: '⚖️', n: 'scales legal lawyer' },
      { e: '📜', n: 'scroll documents wills' },
      { e: '📋', n: 'clipboard paperwork' },
      { e: '🗓️', n: 'calendar schedule bills' },
      { e: '⏰', n: 'alarm clock reminders' },
      { e: '⭐', n: 'star goals' },
      { e: '🔥', n: 'fire hot priority' },
      { e: '✨', n: 'sparkles wishlist' },
      { e: '✅', n: 'check done goals' },
      { e: '📌', n: 'pin needs fixed' },
      { e: '🎄', n: 'christmas holiday gifts' },
      { e: '🎃', n: 'halloween holiday' },
      { e: '💐', n: 'flowers gifts' },
      { e: '🕊️', n: 'dove charity giving' },
      { e: '🙏', n: 'prayer faith donations' },
      { e: '♻️', n: 'recycle green eco' },
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

export const BUDGET_PARENT_NAMES = ['Needs', 'Wants', 'Savings Goals', 'Other']

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
    isCcPayment: Boolean(row.is_cc_payment),
    linkedAccountId: row.linked_account_id || null,
    isSystem: Boolean(row.is_system),
  }
}

/** Locked budget parents (Needs / Wants / Savings Goals / Other). */
export function isBudgetParent(cat) {
  if (!cat) return false
  return Boolean(cat.isSystem) || BUDGET_PARENT_NAMES.includes(cat.name)
}

/** Role in the budget hierarchy: parent → group → category. */
export function getCategoryRole(categories, cat) {
  if (isBudgetParent(cat)) return 'parent'
  const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null
  if (parent && isBudgetParent(parent)) {
    if (parent.name === 'Savings Goals') return 'category'
    return 'group'
  }
  return 'category'
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
  const filtered = categories.filter((c) => !type || c.type === type)

  const build = (parentId) =>
    filtered
      .filter((c) => (c.parentId || null) === (parentId || null))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((node) => ({
        ...node,
        children: build(node.id),
      }))

  return build(null)
}

/** Depth of a category in the tree (0 = root). */
export function getCategoryDepth(categories, categoryId) {
  let depth = 0
  let cur = categories.find((c) => c.id === categoryId)
  while (cur?.parentId) {
    depth += 1
    cur = categories.find((c) => c.id === cur.parentId)
    if (depth > 10) break
  }
  return depth
}
