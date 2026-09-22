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
      className="fixed left-4 right-4 z-50 md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto bg-[#F9F9F9]  border border-white/40 shadow-md rounded-[32px] ring-1 ring-black/5 transition-all duration-300"
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <nav className="flex justify-around items-center h-[68px] px-2">
        {tabs.map((tab) => {
          const isActive = ('matchPaths' in tab && Array.isArray(tab.matchPaths))
            ? tab.matchPaths.some(p => pathname === p || pathname.startsWith(p))
            : pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 active:scale-95 ${isActive ? "text-blue-500" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? "fill-blue-500/20" : ""}`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium tracking-tight ${isActive ? "font-semibold" : ""}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
