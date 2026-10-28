import {
  Bus,
  Clapperboard,
  HeartPulse,
  House,
  Shirt,
  Smartphone,
  Tag,
  Utensils,
  Zap,
} from 'lucide-react'

const categoryIcons = {
  utensils: Utensils,
  bus: Bus,
  home: House,
  zap: Zap,
  smartphone: Smartphone,
  shirt: Shirt,
  'heart-pulse': HeartPulse,
  clapperboard: Clapperboard,
  tag: Tag,
}

export function getCategoryIcon(name) {
  return categoryIcons[name] ?? Tag
}