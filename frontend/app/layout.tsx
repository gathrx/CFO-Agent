import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Personal CFO | Expense Tracker",
  description: "AI-powered personal finance management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-900 text-slate-100 min-h-screen">
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 ml-60 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

