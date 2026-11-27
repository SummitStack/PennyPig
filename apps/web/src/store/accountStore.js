import { create } from 'zustand'
import { supabase } from '../lib/supabase'

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.account_type,
    plaidAccountId: row.plaid_account_id,
    plaidItemId: row.plaid_item_id,
    accountNumber: row.mask ? `••${row.mask}` : '',
    mask: row.mask || null,
    institution: row.institution_name || (row.plaid_account_id ? 'Linked account' : 'Manual account'),
    balance: Number(row.balance) || 0,
    lastSynced: row.last_synced ? new Date(row.last_synced) : null,
    status: row.closed ? 'closed' : 'active',
    isManual: Boolean(row.is_manual),
    onBudget: row.on_budget !== false,
    closed: Boolean(row.closed),
    creditCardCategoryId: row.credit_card_category_id || null,
    note: row.note || '',
  }
}

export const useAccountStore = create((set, get) => ({
  linkedAccounts: [],
  loading: false,
  error: null,
  hydrated: false,

  loadAccounts: async () => {
    if (!supabase) {
      set({ linkedAccounts: [], hydrated: true })
      return
    }

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      set({
        linkedAccounts: (data || []).map(mapAccount),
        loading: false,
        hydrated: true,
      })
    } catch (err) {
      set({ error: err.message, loading: false, hydrated: true })
    }
  },

  createManualAccount: async ({ name, accountType, balance, onBudget = true }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    // A positive starting balance on an on-budget cash account is money you can
    // budget. Record it as a "Starting balance" inflow so it reaches Ready to
    // Assign (before, it only changed the account balance). The account starts
    // at 0 and the inflow brings it to the entered balance.
    const startingAmount = Number(balance) || 0
    const recordStarting = onBudget && accountType !== 'credit' && startingAmount > 0
    // Debt you already owe (credit card, loan) is recorded as a "Starting
    // balance" transaction too, but kept out of the budget: it was spent before
    // you started budgeting, so it shouldn't show as this month's spending or
    // pull from Ready to Assign. Before, the balance appeared with no
    // transaction behind it, so the register never added up to it.
    const isDebt = accountType === 'credit' || accountType === 'loan'
    const recordDebt = isDebt && Math.abs(startingAmount) >= 0.005

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: String(name || '').trim(),
        account_type: accountType,
        balance: recordStarting || recordDebt ? 0 : startingAmount,
        is_manual: true,
        on_budget: onBudget,
        plaid_account_id: null,
        plaid_item_id: null,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    let account = mapAccount(data)

    if (accountType === 'credit') {
      const { useTransactionStore } = await import('./transactionStore')
      await useTransactionStore.getState().ensureCreditCardCategory(account)

      const { data: refreshed, error: refreshErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', data.id)
        .single()

      if (!refreshErr && refreshed) {
        account = mapAccount(refreshed)
      }
    }

    set((state) => ({
      linkedAccounts: [...state.linkedAccounts, account],
    }))

    try {
      const { useTransactionStore } = await import('./transactionStore')
      useTransactionStore.setState((state) => ({
        accounts: [...state.accounts, account],
      }))
    } catch {
      // transactionStore may not be loaded yet
    }

    if (recordStarting) {
      const { useTransactionStore } = await import('./transactionStore')
      const txStore = useTransactionStore.getState()
      const incomeLeaves = (txStore.categories || []).filter(
        (c) => c.type === 'income' && !(txStore.categories || []).some((k) => k.parentId === c.id)
      )
      const incomeCat =
        incomeLeaves.find((c) => /other income/i.test(c.name)) || incomeLeaves[0] || null
      const { todayLocal } = await import('../lib/money')
      const result = await txStore.createTransaction({
        date: todayLocal(),
        payee: 'Starting balance',
        amount: startingAmount,
        inflow: true,
        accountId: account.id,
        categoryId: incomeCat?.id || null,
      })
      if (result.success) {
        account = { ...account, balance: startingAmount }
      } else {
        // Fall back to setting the balance directly so the account still matches the bank.
        await supabase.from('accounts').update({ balance: startingAmount }).eq('id', account.id)
        account = { ...account, balance: startingAmount }
        set((state) => ({
          linkedAccounts: state.linkedAccounts.map((a) => (a.id === account.id ? account : a)),
        }))
      }
    }

    if (recordDebt) {
      const { useTransactionStore } = await import('./transactionStore')
      const { todayLocal } = await import('../lib/money')
      const result = await useTransactionStore.getState().createTransaction({
        date: todayLocal(),
        payee: 'Starting balance',
        amount: Math.abs(startingAmount),
        // Owed is entered as negative: that's money out of the account.
        inflow: startingAmount > 0,
        accountId: account.id,
        excludeFromBudget: true,
      })
      account = { ...account, balance: startingAmount }
      if (!result.success) {
        await supabase.from('accounts').update({ balance: startingAmount }).eq('id', account.id)
      }
      set((state) => ({
        linkedAccounts: state.linkedAccounts.map((a) => (a.id === account.id ? account : a)),
      }))
    }

    return { success: true, account }
  },

  updateAccount: async (id, patch) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const payload = {}
    if (patch.name !== undefined) payload.name = String(patch.name).trim()
    if (patch.onBudget !== undefined) payload.on_budget = patch.onBudget
    if (patch.closed !== undefined) payload.closed = patch.closed
    if (patch.note !== undefined) payload.note = patch.note || null
    if (patch.balance !== undefined) payload.balance = Number(patch.balance) || 0
    if (patch.type !== undefined) payload.account_type = patch.type

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'Nothing to update' }
    }

    const { data, error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    const account = mapAccount(data)
    set((state) => ({
      linkedAccounts: state.linkedAccounts.map((a) => (a.id === id ? account : a)),
    }))

    try {
      const { useTransactionStore } = await import('./transactionStore')
      useTransactionStore.setState((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? account : a)),
      }))
    } catch {
      // transactionStore may not be loaded yet
    }

    return { success: true, account }
  },

  reconcileAccount: async (accountId, { statementDate, statementBalance, clearedBalance }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const account = get().linkedAccounts.find((a) => a.id === accountId)
    if (!account) return { success: false, error: 'Account not found' }

    const { useTransactionStore } = await import('./transactionStore')
    const txnStore = useTransactionStore.getState()
    const accountTxns = txnStore.transactions.filter((t) => t.accountId === accountId)

    let clearedBal = clearedBalance
    if (clearedBal === undefined || clearedBal === null) {
      const unclearedEffect = accountTxns
        .filter((t) => !t.cleared)
        .reduce((s, t) => s - Number(t.amount), 0)
      clearedBal = (Number(account.balance) || 0) - unclearedEffect
    }

    const stmtBal = Number(statementBalance) || 0
    const difference = stmtBal - Number(clearedBal)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const { error: reconErr } = await supabase.from('account_reconciliations').insert({
      user_id: user.id,
      account_id: accountId,
      statement_date: statementDate,
      statement_balance: stmtBal,
      cleared_balance: Number(clearedBal),
      difference,
    })

    if (reconErr) return { success: false, error: reconErr.message }

    const { error: acctErr } = await supabase
      .from('accounts')
      .update({ balance: stmtBal })
      .eq('id', accountId)

    if (acctErr) return { success: false, error: acctErr.message }

    const updated = { ...account, balance: stmtBal }
    set((state) => ({
      linkedAccounts: state.linkedAccounts.map((a) =>
        a.id === accountId ? updated : a
      ),
    }))

    useTransactionStore.setState((state) => ({
      accounts: state.accounts.map((a) => (a.id === accountId ? updated : a)),
    }))

    return { success: true, difference, clearedBalance: clearedBal, statementBalance: stmtBal }
  },

  removeAccount: async (accountId) => {
    if (!supabase) {
      set((state) => ({
        linkedAccounts: state.linkedAccounts.filter((acc) => acc.id !== accountId),
      }))
      return { success: true }
    }

    const { error } = await supabase.from('accounts').delete().eq('id', accountId)
    if (error) return { success: false, error: error.message }

    set((state) => ({
      linkedAccounts: state.linkedAccounts.filter((acc) => acc.id !== accountId),
    }))

    try {
      const { useTransactionStore } = await import('./transactionStore')
      useTransactionStore.setState((state) => ({
        accounts: state.accounts.filter((a) => a.id !== accountId),
      }))
    } catch {
      // transactionStore may not be loaded yet
    }

    return { success: true }
  },
}))
