import { create } from 'zustand'

export const useAccountStore = create((set, get) => ({
  linkedAccounts: [
    {
      id: 'acc_1',
      name: 'Chase Checking',
      type: 'checking',
      plaidAccountId: 'BxBXxkx9PRwxJ516DkJTSL3XA',
      accountNumber: '****8921',
      routingNumber: '021000021',
      institution: 'Chase Bank',
      balance: 8749.00,
      lastSynced: new Date(Date.now() - 3600000),
      status: 'active'
    },
    {
      id: 'acc_2',
      name: 'American Express',
      type: 'credit',
      plaidAccountId: 'BxBXxkx9PRwxJ516DkJTSL3XB',
      accountNumber: '****1004',
      institution: 'American Express',
      balance: -2145.00,
      lastSynced: new Date(Date.now() - 3600000),
      status: 'active'
    }
  ],

  addAccount: (accountData) => set((state) => ({
    linkedAccounts: [...state.linkedAccounts, {
      ...accountData,
      id: `acc_${Date.now()}`,
      status: 'active',
      lastSynced: new Date()
    }]
  })),

  removeAccount: (accountId) => set((state) => ({
    linkedAccounts: state.linkedAccounts.filter(acc => acc.id !== accountId)
  })),

  syncAccount: (accountId) => set((state) => ({
    linkedAccounts: state.linkedAccounts.map(acc =>
      acc.id === accountId
        ? { ...acc, lastSynced: new Date() }
        : acc
    )
  })),

  updateAccountBalance: (accountId, balance) => set((state) => ({
    linkedAccounts: state.linkedAccounts.map(acc =>
      acc.id === accountId
        ? { ...acc, balance }
        : acc
    )
  }))
}))
