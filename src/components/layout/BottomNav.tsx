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

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav on the full-screen chat page
  if (pathname === '/transactions') return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto bg-[#F9F9F9]/92 dark:bg-[#1C1C1E]/92 backdrop-blur-xl border-t border-black/[0.08] shadow-[0_-2px_12px_rgba(0,0,0,0.03)] transition-all duration-300"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 8px))' }}
    >
      <nav className="flex justify-around items-center h-[54px] px-1">
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
                className={`w-[22px] h-[22px] transition-transform ${isActive ? "scale-105 stroke-[2.4]" : "stroke-[1.8]"}`} 
              />
              <span className={`text-[10.5px] tracking-tight leading-tight transition-all ${
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
