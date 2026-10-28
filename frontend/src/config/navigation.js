import {
  Banknote,
  BarChart3,
  BookOpen,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'

export const mainNav = [
  {
    to: '/',
    label: 'Home',
    icon: LayoutDashboard,
    end: true,
    description: 'Your money at a glance',
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: Receipt,
    description: 'Log and review your daily spending',
  },
  {
    to: '/budget',
    label: 'Budget',
    icon: Target,
    description: 'Plan monthly and daily limits',
  },
  {
    to: '/accounts',
    label: 'Accounts',
    icon: Wallet,
    description: 'Where your money lives',
  },
  {
    to: '/income',
    label: 'Income',
    icon: Banknote,
    description: 'Salary, side hustles and other earnings',
  },
  {
    to: '/savings',
    label: 'Savings',
    icon: PiggyBank,
    description: 'Money you set aside on purpose',
  },
  {
    to: '/obligations',
    label: 'Obligations',
    icon: HandCoins,
    description: 'Debts and commitments you are paying off',
  },
  {
    to: '/investments',
    label: 'Investments',
    icon: TrendingUp,
    description: 'Stocks, money market funds and businesses',
  },
  {
    to: '/purchases',
    label: 'Purchases',
    icon: ShoppingBag,
    description: 'Big buys, paid in cash or financed',
  },
  {
    to: '/ledger',
    label: 'Ledger',
    icon: BookOpen,
    description: 'Every movement of your money',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    description: 'Spot patterns and plug the leaks',
  },
]

export const mobileLeft = mainNav.slice(0, 2)
export const mobileRight = mainNav.slice(2, 3)
export const moreNav = mainNav.slice(3)