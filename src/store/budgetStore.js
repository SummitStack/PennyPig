import { create } from 'zustand'

export const useBudgetStore = create((set) => ({
  budgets: {},
  readyToAssign: 0,
  
  setBudget: (categoryId, amount) => set((state) => ({
    budgets: { ...state.budgets, [categoryId]: amount }
  }))
}))
