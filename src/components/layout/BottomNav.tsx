"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookText, 
  MessageCircle, 
  FileText, 
  Users, 
  Cloud 
} from "lucide-react";

const tabs = [
  {
    name: "Quotation",
    href: "/quotations",
    icon: FileText,
  },
  {
    name: "Ledger",
    href: "/ecs-ledger",
    icon: BookText,
  },
  {
    name: "Expert",
    href: "/expert-hisab",
    icon: MessageCircle,
    matchPaths: ["/expert-hisab", "/transactions"],
  },
  {
    name: "Employee",
    href: "/employee-payments",
    icon: Users,
    matchPaths: ["/employee-payments"],
  },
  {
    name: "Drive",
    href: "/drive",
    icon: Cloud,
  },
];

const MAIN_TAB_ROUTES = [
  '/quotations',
  '/ecs-ledger',
  '/expert-hisab',
  '/employee-payments',
  '/drive',
];

export function BottomNav() {
  const pathname = usePathname();

  // Bottom navigation is only for top-level main tab screens
  if (!pathname || !MAIN_TAB_ROUTES.includes(pathname)) return null;

  return (
    <div 
      className="fixed left-3.5 right-3.5 z-50 md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto bg-[#F9F9F9]/92 dark:bg-[#1C1C1E]/92 backdrop-blur-xl border border-white/60 shadow-[0_6px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5 rounded-[28px] transition-all duration-300"
      style={{ bottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}
    >
      <nav className="flex justify-around items-center h-[56px] px-1.5">
        {tabs.map((tab) => {
          const isActive = ('matchPaths' in tab && Array.isArray(tab.matchPaths))
            ? tab.matchPaths.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))
            : pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 space-y-0.5 transition-all duration-150 active:scale-90 select-none ${
                isActive ? "text-[#1D68F2]" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Icon 
                className={`w-[21px] h-[21px] transition-transform ${isActive ? "scale-105 stroke-[2.4]" : "stroke-[1.8]"}`} 
              />
              <span className={`text-[10px] tracking-tight leading-tight transition-all ${
                isActive ? "font-semibold text-[#1D68F2]" : "font-medium text-gray-500"
              }`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
