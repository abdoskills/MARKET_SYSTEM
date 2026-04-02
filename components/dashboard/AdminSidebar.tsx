"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, BarChart2, Users, Menu, X, Home, TicketPercent } from "lucide-react";

type AdminSidebarProps = {
  role?: string;
};

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "الصفحة الرئيسية", href: "/", icon: Home },
    { name: "لوحة القيادة", href: "/admin/logs", icon: LayoutDashboard },
    { name: "المخزون", href: "/inventory", icon: Package },
    { name: "الطلبات", href: "/orders", icon: ShoppingCart },
    { name: "التحليلات", href: "/analytics", icon: BarChart2 },
    { name: "المستخدمين", href: "/users", icon: Users },
    ...(role === "ADMIN" ? [{ name: "العروض والكوبونات", href: "/admin/offers", icon: TicketPercent }] : []),
  ];

  const handleToggle = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isOpen ? (
        <div className="md:hidden fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-50">
          <button
            onClick={handleToggle}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-[#006c4a] text-white shadow-lg shadow-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {/* Sidebar Overlay (Mobile) */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={handleToggle}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 right-0 h-full bg-white border-l border-gray-100 shadow-sm w-64 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        } flex flex-col`}
        dir="rtl"
      >
        <div className="p-6 border-b border-gray-50 flex-shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#006c4a]">نظام الإدارة</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="md:hidden min-h-[44px] min-w-[44px] rounded-2xl border border-emerald-200 text-[#006c4a] flex items-center justify-center"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {role ? <p className="mt-1 text-xs text-gray-500">الدور: {role}</p> : null}
        </div>
        
        <nav className="flex-1 overflow-y-auto w-full p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 min-h-[44px] rounded-xl font-medium transition-colors ${
                  isActive
                    ? "bg-[#e8f3ee] text-[#006c4a]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#006c4a]" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
