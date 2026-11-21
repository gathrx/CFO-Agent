"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  PlusCircle,
  ClipboardCheck,
  Bell,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { AUTH_DISABLED, getFirebaseAuth } from "@/lib/firebase";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Screenshot", icon: Upload },
  { href: "/manual", label: "Add Expense", icon: PlusCircle },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/alerts", label: "Nightly Alerts", icon: Bell },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-navy-800 border-r border-slate-700/50 flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Personal CFO</div>
            <div className="text-xs text-slate-400">Finance Manager</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 space-y-3">
        <div className="text-xs text-slate-500">
          Goal: 30% Investment 📈
        </div>
        {!AUTH_DISABLED && (
          <button
            onClick={() => signOut(getFirebaseAuth())}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
            {getFirebaseAuth().currentUser?.email && (
              <span className="truncate text-slate-500">
                ({getFirebaseAuth().currentUser?.email})
              </span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

