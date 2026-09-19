/**
 * Category idea packs organized into three buckets:
 * Fixed expenses → Variable expenses → Savings Goals.
 *
 * Each pack is a parent group; `categories` are its subcategories.
 * Packs are opt-in (not re-seeded). Default DB seed stays the original
 * Living / Food & Dining tree — packs merge by name when overlapping.
 */

export const BUCKETS = [
  {
    id: 'fixed',
    name: 'Fixed expenses',
    emoji: '📌',
    description: 'Predictable costs that stay fairly stable month to month',
  },
  {
    id: 'variable',
    name: 'Variable expenses',
    emoji: '📊',
    description: 'Spending that flexes with your choices and lifestyle',
  },
  {
    id: 'savings',
    name: 'Savings Goals',
    emoji: '🎯',
    description: 'Money you’re setting aside on purpose',
  },
]

/**
 * Optional aliases: existing seeded names that count as the same pack group.
 * Prevents duplicating Living / Food & Dining when adding Housing / Groceries packs.
 */
export const GROUP_ALIASES = {
  Housing: ['Living'],
  'Groceries & Food': ['Food & Dining'],
  Entertainment: ['Entertainment'],
  Transportation: ['Transportation'],
  'Savings Goals': ['Savings Goals'],
}

export const CATEGORY_PACKS = [
  // ── Fixed ────────────────────────────────────────────────────────────────
  {
    id: 'housing',
    bucket: 'fixed',
    name: 'Housing',
    emoji: '🏠',
    color: '#34d399',
    description: 'Rent or mortgage and keeping a roof overhead',
    categories: [
      { name: 'Rent/Mortgage', emoji: '🏡' },
      { name: 'Property Tax', emoji: '🧾' },
      { name: 'Home Insurance', emoji: '🛡️' },
      { name: 'HOA Fees', emoji: '🏘️' },
      { name: 'Maintenance & Repairs', emoji: '🔧' },
    ],
  },
  {
    id: 'utilities',
    bucket: 'fixed',
    name: 'Utilities',
    emoji: '💡',
    color: '#fbbf24',
    description: 'Power, water, gas, and connectivity',
    categories: [
      { name: 'Electricity', emoji: '⚡' },
      { name: 'Water/Sewer', emoji: '💧' },
      { name: 'Natural Gas', emoji: '🔥' },
      { name: 'Internet/Phone', emoji: '📶' },
      { name: 'Subscriptions', emoji: '📱' },
    ],
  },
  {
    id: 'transportation',
    bucket: 'fixed',
    name: 'Transportation',
    emoji: '🚗',
    color: '#60a5fa',
    description: 'Getting around day to day',
    categories: [
      { name: 'Car Payment', emoji: '🚙' },
      { name: 'Car Insurance', emoji: '📋' },
      { name: 'Gas', emoji: '⛽' },
      { name: 'Vehicle Maintenance & Repairs', emoji: '🛠️' },
      { name: 'Public Transit', emoji: '🚌' },
      { name: 'Parking', emoji: '🅿️' },
    ],
  },
  {
    id: 'insurance',
    bucket: 'fixed',
    name: 'Insurance',
    emoji: '🛡️',
    color: '#94a3b8',
    description: 'Coverage beyond home and auto',
    categories: [
      { name: 'Health Insurance', emoji: '🏥' },
      { name: 'Life Insurance', emoji: '💙' },
      { name: 'Disability Insurance', emoji: '♿' },
    ],
  },
  {
    id: 'debt-payments',
    bucket: 'fixed',
    name: 'Debt Payments',
    emoji: '💳',
    color: '#f87171',
    description: 'Paying down what you owe',
    categories: [
      { name: 'Student Loans', emoji: '🎓' },
      { name: 'Credit Card Minimum', emoji: '💳' },
      { name: 'Personal Loans', emoji: '🏦' },
    ],
  },

  // ── Variable ─────────────────────────────────────────────────────────────
  {
    id: 'groceries-food',
    bucket: 'variable',
    name: 'Groceries & Food',
    emoji: '🍽️',
    color: '#f472b6',
    description: 'Everyday eating and takeout',
    categories: [
      { name: 'Groceries', emoji: '🛒' },
      { name: 'Restaurants & Dining Out', emoji: '🍝' },
      { name: 'Coffee/Café', emoji: '☕' },
      { name: 'Food Delivery', emoji: '🛵' },
    ],
  },
  {
    id: 'health-personal-care',
    bucket: 'variable',
    name: 'Health & Personal Care',
    emoji: '🩺',
    color: '#fb7185',
    description: 'Medical, fitness, and looking after yourself',
    categories: [
      { name: 'Doctor/Medical', emoji: '🩺' },
      { name: 'Dental', emoji: '🦷' },
      { name: 'Pharmacy', emoji: '💊' },
      { name: 'Gym/Fitness', emoji: '🏋️' },
      { name: 'Haircut/Salon', emoji: '💇' },
      { name: 'Personal Care Items', emoji: '🧴' },
    ],
  },
  {
    id: 'clothing-accessories',
    bucket: 'variable',
    name: 'Clothing & Accessories',
    emoji: '👕',
    color: '#fbbf24',
    description: 'What you wear and how you care for it',
    categories: [
      { name: 'Clothes', emoji: '👕' },
      { name: 'Shoes', emoji: '👟' },
      { name: 'Accessories', emoji: '👜' },
      { name: 'Dry Cleaning', emoji: '👔' },
    ],
  },
  {
    id: 'entertainment',
    bucket: 'variable',
    name: 'Entertainment',
    emoji: '🎬',
    color: '#a78bfa',
    description: 'Fun, media, and hobbies',
    categories: [
      { name: 'Movies/Streaming', emoji: '📺' },
      { name: 'Games/Gaming', emoji: '🎮' },
      { name: 'Books', emoji: '📚' },
      { name: 'Concerts/Events', emoji: '🎟️' },
      { name: 'Hobbies', emoji: '🎨' },
    ],
  },
  {
    id: 'pets',
    bucket: 'variable',
    name: 'Pets',
    emoji: '🐾',
    color: '#fdba74',
    description: 'Food, vet visits, and pet supplies',
    categories: [
      { name: 'Pet Food', emoji: '🦴' },
      { name: 'Vet Care', emoji: '🐕' },
      { name: 'Pet Supplies', emoji: '🧸' },
      { name: 'Grooming', emoji: '✂️' },
    ],
  },
  {
    id: 'household-garden',
    bucket: 'variable',
    name: 'Household & Garden',
    emoji: '🪴',
    color: '#86efac',
    description: 'Home supplies, furniture, and outdoors',
    categories: [
      { name: 'Cleaning Supplies', emoji: '🧹' },
      { name: 'Furniture', emoji: '🛋️' },
      { name: 'Home Decor', emoji: '🖼️' },
      { name: 'Yard/Garden', emoji: '🌱' },
    ],
  },
  {
    id: 'gifts-donations',
    bucket: 'variable',
    name: 'Gifts & Donations',
    emoji: '🎁',
    color: '#f9a8d4',
    description: 'Giving to others and causes you care about',
    categories: [
      { name: 'Gifts for Others', emoji: '🎀' },
      { name: 'Charitable Donations', emoji: '❤️' },
      { name: 'Holiday Gifts', emoji: '🎄' },
    ],
  },
  {
    id: 'education',
    bucket: 'variable',
    name: 'Education',
    emoji: '🎓',
    color: '#7dd3fc',
    description: 'School and learning costs',
    categories: [
      { name: 'Tuition', emoji: '🏫' },
      { name: 'Books/Supplies', emoji: '📖' },
      { name: 'Courses/Training', emoji: '🧑‍💻' },
    ],
  },
  {
    id: 'personal-development',
    bucket: 'variable',
    name: 'Personal Development',
    emoji: '📈',
    color: '#c4b5fd',
    description: 'Growth outside formal school',
    categories: [
      { name: 'Self-help Books', emoji: '📕' },
      { name: 'Conferences', emoji: '🎤' },
      { name: 'Workshops', emoji: '🧩' },
    ],
  },
  {
    id: 'travel-vacation',
    bucket: 'variable',
    name: 'Travel & Vacation',
    emoji: '✈️',
    color: '#38bdf8',
    description: 'Trips away from home',
    categories: [
      { name: 'Flights', emoji: '🛫' },
      { name: 'Hotels/Lodging', emoji: '🏨' },
      { name: 'Car Rental', emoji: '🚕' },
      { name: 'Activities/Tours', emoji: '🗺️' },
      { name: 'Meals (travel)', emoji: '🍜' },
    ],
  },

  // ── Savings (subcategories hang directly under the Savings Goals bucket) ─
  {
    id: 'savings-goals',
    bucket: 'savings',
    name: 'Savings Goals',
    emoji: '🎯',
    color: '#4ade80',
    description: 'Funds you’re building toward',
    /** Leaves attach to the bucket itself (no extra parent under the bucket). */
    attachToBucket: true,
    categories: [
      { name: 'Emergency Fund', emoji: '🛟' },
      { name: 'Vacation Fund', emoji: '🏖️' },
      { name: 'Car Purchase', emoji: '🚘' },
      { name: 'Home Down Payment', emoji: '🔑' },
      { name: 'Wedding', emoji: '💍' },
      { name: 'Home Repairs', emoji: '🏗️' },
      { name: 'Car Repairs', emoji: '🔩' },
      { name: 'Medical', emoji: '🏥' },
      { name: 'Annual Expenses', emoji: '📅' },
    ],
  },
]

export function getBucket(id) {
  return BUCKETS.find((b) => b.id === id) || null
}

export function getPacksForBucket(bucketId) {
  return CATEGORY_PACKS.filter((p) => p.bucket === bucketId)
}

export function getPackById(id) {
  return CATEGORY_PACKS.find((p) => p.id === id) || null
}

export function findGroupCategory(pack, categories) {
  const names = [pack.name, ...(GROUP_ALIASES[pack.name] || [])]
  const lower = new Set(names.map((n) => n.toLowerCase()))
  return categories.find((c) => lower.has(c.name.toLowerCase())) || null
}

export function packInstallStatus(pack, categories) {
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]))
  const group = findGroupCategory(pack, categories)
  const existingChildren = pack.categories.filter((c) =>
    byName.has(c.name.toLowerCase())
  )
  const missingChildren = pack.categories.filter(
    (c) => !byName.has(c.name.toLowerCase())
  )

  // Savings attach-to-bucket: "installed" when all leaves exist (bucket optional)
  if (pack.attachToBucket) {
    return {
      groupExists: Boolean(group),
      groupId: group?.id || null,
      existingCount: existingChildren.length,
      missingCount: missingChildren.length,
      total: pack.categories.length,
      fullyInstalled:
        missingChildren.length === 0 && pack.categories.length > 0,
      partial: existingChildren.length > 0 && missingChildren.length > 0,
    }
  }

  return {
    groupExists: Boolean(group),
    groupId: group?.id || null,
    existingCount: existingChildren.length,
    missingCount: missingChildren.length,
    total: pack.categories.length,
    fullyInstalled:
      Boolean(group) &&
      missingChildren.length === 0 &&
      pack.categories.length > 0,
    partial: Boolean(group) || existingChildren.length > 0,
  }
}
