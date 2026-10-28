import { Briefcase, Coins, Laptop, Store } from 'lucide-react'

export const incomeTypes = [
  { value: 'salary', label: 'Salary', icon: Briefcase },
  { value: 'side_hustle', label: 'Side hustle', icon: Laptop },
  { value: 'business', label: 'Business', icon: Store },
  { value: 'other', label: 'Other', icon: Coins },
]

export const incomeTypeMap = Object.fromEntries(
  incomeTypes.map((type) => [type.value, type]),
)