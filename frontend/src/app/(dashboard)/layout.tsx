"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("Dashboard Layout - Session Status:", { session: !!session, isPending });
    if (!isPending && !session) {
      console.log("No session found, redirecting to /auth");
      router.push("/auth");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Persistent Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">MeterFlow</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"}`}>
            Overview
          </Link>
          <Link href="/apis" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/apis" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"}`}>
            APIs
          </Link>
          <Link href="/keys" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/keys" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"}`}>
            API Keys
          </Link>
          <Link href="/billing" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/billing" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"}`}>
            Billing
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors w-full px-4 py-2">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar for mobile or user profile */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="md:hidden">
            <h1 className="text-xl font-bold text-blue-600">MeterFlow</h1>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
              {session.user.name?.[0] || session.user.email[0]}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
