"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { TrendingUp } from "lucide-react";
import { AUTH_DISABLED, getFirebaseAuth } from "@/lib/firebase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!AUTH_DISABLED);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    return onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (AUTH_DISABLED || user) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  const signIn = async () => {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-700/50 bg-navy-800 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
          <TrendingUp className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="mb-1 text-lg font-bold text-white">Personal CFO</h1>
        <p className="mb-6 text-sm text-slate-400">Sign in to see your finances.</p>
        <button
          onClick={signIn}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Sign in with Google
        </button>
        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
