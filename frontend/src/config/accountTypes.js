import { Banknote, Landmark, Smartphone, Wallet } from 'lucide-react'

export const accountTypes = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank', icon: Landmark },
  { value: 'mobile_money', label: 'Mobile money', icon: Smartphone },
  { value: 'other', label: 'Other', icon: Wallet },
]

export const accountTypeMap = Object.fromEntries(
  accountTypes.map((type) => [type.value, type]),
)