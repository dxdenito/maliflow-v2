import { Coins, Landmark, Store, TrendingUp } from 'lucide-react'

export const investmentTypes = [
  { value: 'stock', label: 'Stocks', icon: TrendingUp },
  { value: 'mmf', label: 'Money market', icon: Landmark },
  { value: 'business', label: 'Business', icon: Store },
  { value: 'other', label: 'Other', icon: Coins },
]

export const investmentTypeMap = Object.fromEntries(
  investmentTypes.map((type) => [type.value, type]),
)