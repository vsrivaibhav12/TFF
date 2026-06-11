import type { LucideIcon } from 'lucide-react';
import {
  Layout,
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  MessageSquare,
  BarChart3,
  Calendar,
  Settings,
  ShieldCheck,
  KeyRound,
  Wallet,
  TrendingUp,
  ScrollText,
  ClipboardList,
  Gavel,
  Search,
  Bell,
  Receipt,
  Calculator,
  Layers,
  UsersRound,
  FileCheck,
  Lock,
  Inbox,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  layout: Layout,
  dashboard: LayoutDashboard,
  users: Users,
  briefcase: Briefcase,
  file: FileText,
  message: MessageSquare,
  chart: BarChart3,
  calendar: Calendar,
  settings: Settings,
  shield: ShieldCheck,
  key: KeyRound,
  wallet: Wallet,
  trending: TrendingUp,
  scroll: ScrollText,
  clipboard: ClipboardList,
  gavel: Gavel,
  search: Search,
  bell: Bell,
  receipt: Receipt,
  calculator: Calculator,
  layers: Layers,
  'users-round': UsersRound,
  group: UsersRound,
  'file-check': FileCheck,
  lock: Lock,
  inbox: Inbox,
};

export type NavIconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  section?: string;
}
