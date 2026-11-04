"use client";

import { Home, LogIn } from "lucide-react";

type HeaderAuthProps = {
  user?: any;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenPropertyManager?: () => void;
};

export function HeaderAuth({
  user,
  onOpenAuth,
  onSignOut,
  onOpenPropertyManager,
}: HeaderAuthProps) {
  if (user) {
    return (
      <div className="flex items-center gap-2">
        {onOpenPropertyManager && (
          <button
            type="button"
            onClick={onOpenPropertyManager}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white px-3 py-1.5 text-xs font-bold text-[#163f2c] transition hover:bg-[#ece8d9]"
            title="Manage your properties and saved scans"
          >
            <Home className="h-3.5 w-3.5 text-[#3f7d45]" />
            <span>My Properties</span>
          </button>
        )}
        <span className="text-xs font-semibold text-[#556950] hidden md:inline">
          {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
        </span>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs font-bold text-[#b6533d] hover:underline px-1"
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {onOpenAuth && (
        <button
          type="button"
          onClick={onOpenAuth}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white px-3.5 py-1.5 text-xs font-bold text-[#163f2c] transition hover:bg-[#ece8d9]"
          title="Sign in to save audits and track your property history"
        >
          <LogIn className="h-3.5 w-3.5 text-[#3f7d45]" />
          <span>Sign In</span>
        </button>
      )}
    </div>
  );
}
