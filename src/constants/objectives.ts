import { TrendingUp, Heart, ShoppingBag, Award } from "lucide-react";
import type { ObjectiveKey } from "@/types/analysis";

export const OBJECTIVE_TABS = [
  { key: "crescer" as ObjectiveKey, label: "Crescer", icon: TrendingUp, color: "text-emerald-400" },
  { key: "engajar" as ObjectiveKey, label: "Engajar", icon: Heart, color: "text-pink-400" },
  { key: "vender" as ObjectiveKey, label: "Vender", icon: ShoppingBag, color: "text-amber-400" },
  { key: "autoridade" as ObjectiveKey, label: "Autoridade", icon: Award, color: "text-violet-400" },
] as const;
