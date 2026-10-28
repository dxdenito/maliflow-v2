import {
  ArrowLeftRight,
  Banknote,
  Flag,
  HandCoins,
  PiggyBank,
  Receipt,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react'

export const ledgerTypes = [
  { value: 'income', label: 'Income', icon: Banknote },
  { value: 'expense', label: 'Expense', icon: Receipt },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
  { value: 'savings_deposit', label: 'Saved', icon: PiggyBank },
  { value: 'savings_withdrawal', label: 'Savings withdrawal', icon: PiggyBank },
  { value: 'debt_payment', label: 'Debt payment', icon: HandCoins },
  { value: 'investment_contribution', label: 'Investment', icon: TrendingUp },
  {
    value: 'investment_withdrawal',
    label: 'Investment withdrawal',
    icon: TrendingUp,
  },
  { value: 'purchase_payment', label: 'Purchase payment', icon: ShoppingBag },
  { value: 'adjustment', label: 'Adjustment', icon: SlidersHorizontal },
  { value: 'opening_balance', label: 'Opening balance', icon: Flag },
]

export const ledgerTypeMap = Object.fromEntries(
  ledgerTypes.map((type) => [type.value, type]),
)

export const manualTypes = ['adjustment', 'transfer']