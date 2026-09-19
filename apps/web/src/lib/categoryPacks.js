/**
 * Budget category packs for PennyPig.
 *
 * - default: true  → seeded automatically for new budgets
 * - default: false → suggested ideas the user can add later
 *
 * Category names must be unique per user (DB constraint), so overlapping
 * labels are disambiguated (e.g. Natural Gas vs Gas/Fuel).
 */

export const CATEGORY_PACKS = [
  {
    id: 'housing',
    name: 'Housing',
    emoji: '🏠',
    color: '#34d399',
    description: 'Rent or mortgage and keeping a roof overhead',
    default: true,
    categories: [
      { name: 'Rent/Mortgage', emoji: '🏡' },
      { name: 'Property Tax', emoji: '🧾' },
      { name: 'Home Insurance', emoji: '🛡️' },
      { name: 'HOA Fees', emoji: '🏘️' },
      { name: 'Home Maintenance & Repairs', emoji: '🔧' },
    ],
  },
  {
    id: 'utilities',
    name: 'Utilities',
    emoji: '💡',
    color: '#fbbf24',
    description: 'Power, water, gas, and connectivity',
    default: true,
    categories: [
      { name: 'Electricity', emoji: '⚡' },
      { name: 'Water/Sewer', emoji: '💧' },
      { name: 'Natural Gas', emoji: '🔥' },
      { name: 'Internet/Phone', emoji: '📶' },
      { name: 'Subscriptions', emoji: '📱' },
    ],
  },
  {
    id: 'groceries-food',
    name: 'Groceries & Food',
    emoji: '🍽️',
    color: '#f472b6',
    description: 'Everyday eating and takeout',
    default: true,
    categories: [
      { name: 'Groceries', emoji: '🛒' },
      { name: 'Restaurants & Dining Out', emoji: '🍝' },
      { name: 'Coffee/Café', emoji: '☕' },
      { name: 'Food Delivery', emoji: '🛵' },
    ],
  },
  {
    id: 'transportation',
    name: 'Transportation',
    emoji: '🚗',
    color: '#60a5fa',
    description: 'Getting around day to day',
    default: true,
    categories: [
      { name: 'Car Payment', emoji: '🚙' },
      { name: 'Car Insurance', emoji: '📋' },
      { name: 'Gas/Fuel', emoji: '⛽' },
      { name: 'Car Maintenance & Repairs', emoji: '🛠️' },
      { name: 'Public Transit', emoji: '🚌' },
      { name: 'Parking', emoji: '🅿️' },
    ],
  },
  {
    id: 'savings-goals',
    name: 'Savings Goals',
    emoji: '🎯',
    color: '#4ade80',
    description: 'Money you’re setting aside on purpose',
    default: true,
    categories: [
      { name: 'Emergency Fund', emoji: '🛟' },
      { name: 'Vacation Fund', emoji: '🏖️' },
      { name: 'Car Purchase', emoji: '🚘' },
      { name: 'Home Down Payment', emoji: '🔑' },
      { name: 'Wedding', emoji: '💍' },
      { name: 'Home Repairs Fund', emoji: '🏗️' },
      { name: 'Car Repairs Fund', emoji: '🔩' },
      { name: 'Medical Fund', emoji: '🏥' },
    ],
  },
  {
    id: 'income',
    name: 'Income',
    emoji: '💰',
    color: '#4ade80',
    description: 'Money coming in',
    default: true,
    type: 'income',
    /** Create listed categories as top-level roots (no parent group). */
    flat: true,
    categories: [{ name: 'Salary', emoji: '💵', type: 'income' }],
  },

  // ── Suggested (opt-in) ───────────────────────────────────────────────────
  {
    id: 'health-personal-care',
    name: 'Health & Personal Care',
    emoji: '🩺',
    color: '#fb7185',
    description: 'Medical, fitness, and looking after yourself',
    default: false,
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
    name: 'Clothing & Accessories',
    emoji: '👕',
    color: '#fbbf24',
    description: 'What you wear and how you care for it',
    default: false,
    categories: [
      { name: 'Clothes', emoji: '👕' },
      { name: 'Shoes', emoji: '👟' },
      { name: 'Accessories', emoji: '👜' },
      { name: 'Dry Cleaning', emoji: '👔' },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '🎬',
    color: '#a78bfa',
    description: 'Fun, media, and hobbies',
    default: false,
    categories: [
      { name: 'Movies/Streaming', emoji: '📺' },
      { name: 'Games/Gaming', emoji: '🎮' },
      { name: 'Books & Magazines', emoji: '📚' },
      { name: 'Concerts/Events', emoji: '🎟️' },
      { name: 'Hobbies', emoji: '🎨' },
    ],
  },
  {
    id: 'pets',
    name: 'Pets',
    emoji: '🐾',
    color: '#fdba74',
    description: 'Food, vet visits, and pet supplies',
    default: false,
    categories: [
      { name: 'Pet Food', emoji: '🦴' },
      { name: 'Vet Care', emoji: '🐕' },
      { name: 'Pet Supplies', emoji: '🧸' },
      { name: 'Pet Grooming', emoji: '✂️' },
    ],
  },
  {
    id: 'household-garden',
    name: 'Household & Garden',
    emoji: '🪴',
    color: '#86efac',
    description: 'Home supplies, furniture, and outdoors',
    default: false,
    categories: [
      { name: 'Cleaning Supplies', emoji: '🧹' },
      { name: 'Furniture', emoji: '🛋️' },
      { name: 'Home Decor', emoji: '🖼️' },
      { name: 'Yard/Garden', emoji: '🌱' },
    ],
  },
  {
    id: 'gifts-donations',
    name: 'Gifts & Donations',
    emoji: '🎁',
    color: '#f9a8d4',
    description: 'Giving to others and causes you care about',
    default: false,
    categories: [
      { name: 'Gifts for Others', emoji: '🎀' },
      { name: 'Charitable Donations', emoji: '❤️' },
      { name: 'Holiday Gifts', emoji: '🎄' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    emoji: '🎓',
    color: '#7dd3fc',
    description: 'School and learning costs',
    default: false,
    categories: [
      { name: 'Tuition', emoji: '🏫' },
      { name: 'Books/Supplies', emoji: '📖' },
      { name: 'Courses/Training', emoji: '🧑‍💻' },
    ],
  },
  {
    id: 'personal-development',
    name: 'Personal Development',
    emoji: '📈',
    color: '#c4b5fd',
    description: 'Growth outside formal school',
    default: false,
    categories: [
      { name: 'Development Books', emoji: '📕' },
      { name: 'Conferences', emoji: '🎤' },
      { name: 'Workshops', emoji: '🧩' },
    ],
  },
  {
    id: 'travel-vacation',
    name: 'Travel & Vacation',
    emoji: '✈️',
    color: '#38bdf8',
    description: 'Trips away from home',
    default: false,
    categories: [
      { name: 'Flights', emoji: '🛫' },
      { name: 'Hotels/Lodging', emoji: '🏨' },
      { name: 'Car Rental', emoji: '🚕' },
      { name: 'Activities/Tours', emoji: '🗺️' },
      { name: 'Travel Meals', emoji: '🍜' },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    emoji: '🛡️',
    color: '#94a3b8',
    description: 'Coverage beyond home and auto',
    default: false,
    categories: [
      { name: 'Health Insurance', emoji: '🏥' },
      { name: 'Life Insurance', emoji: '💙' },
      { name: 'Disability Insurance', emoji: '♿' },
    ],
  },
  {
    id: 'debt-payments',
    name: 'Debt Payments',
    emoji: '💳',
    color: '#f87171',
    description: 'Paying down what you owe',
    default: false,
    categories: [
      { name: 'Student Loans', emoji: '🎓' },
      { name: 'Credit Card Minimum', emoji: '💳' },
      { name: 'Personal Loans', emoji: '🏦' },
    ],
  },
  {
    id: 'annual-expenses',
    name: 'Annual Expenses',
    emoji: '📅',
    color: '#a3e635',
    description: 'Once-a-year costs to plan ahead for',
    default: false,
    categories: [
      { name: 'Car Registration', emoji: '🚘' },
      { name: 'Insurance Deductibles', emoji: '📑' },
      { name: 'Memberships & Dues', emoji: '🪪' },
    ],
  },
]

export function getDefaultPacks() {
  return CATEGORY_PACKS.filter((p) => p.default)
}

export function getSuggestedPacks() {
  return CATEGORY_PACKS.filter((p) => !p.default)
}

export function getPackById(id) {
  return CATEGORY_PACKS.find((p) => p.id === id) || null
}

/** How many of a pack’s categories already exist for this user. */
export function packInstallStatus(pack, categories) {
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]))
  const existingChildren = pack.categories.filter((c) =>
    byName.has(c.name.toLowerCase())
  )
  const missingChildren = pack.categories.filter(
    (c) => !byName.has(c.name.toLowerCase())
  )

  if (pack.flat) {
    return {
      groupExists: false,
      groupId: null,
      existingCount: existingChildren.length,
      missingCount: missingChildren.length,
      total: pack.categories.length,
      fullyInstalled: missingChildren.length === 0 && pack.categories.length > 0,
      partial: existingChildren.length > 0 && missingChildren.length > 0,
    }
  }

  const group = byName.get(pack.name.toLowerCase())
  return {
    groupExists: Boolean(group),
    groupId: group?.id || null,
    existingCount: existingChildren.length,
    missingCount: missingChildren.length,
    total: pack.categories.length,
    fullyInstalled:
      Boolean(group) && missingChildren.length === 0 && pack.categories.length > 0,
    partial: Boolean(group) || existingChildren.length > 0,
  }
}
