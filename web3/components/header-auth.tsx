/* eslint-disable @next/next/no-img-element */
"use client";

import { Home, LogIn, LogOut, User as UserIcon } from "lucide-react";

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
    const displayName =
      user.displayName?.split(" ")[0] ||
      user.user_metadata?.full_name?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "User";

    return (
      <div className="flex items-center gap-2">
        {onOpenPropertyManager && (
          <button
            type="button"
            onClick={onOpenPropertyManager}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white px-3 py-1.5 text-xs font-semibold text-[#163f2c] transition hover:bg-[#f3f0e6] shadow-2xs"
            title="Manage your properties and saved scans"
          >
            <Home className="h-3.5 w-3.5 text-[#2f7d3a]" />
            <span>My Properties</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white pl-1.5 pr-2.5 py-1 text-xs font-medium text-[#1d2a21] shadow-2xs">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="h-5 w-5 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-5 w-5 place-items-center rounded-full bg-[#163f2c] text-[0.65rem] font-bold text-[#faf9f5]">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="max-w-[100px] truncate">{displayName}</span>
        </div>

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="grid h-7 w-7 place-items-center rounded-full border border-[#e2dec9] bg-white text-[#9c4b37] transition hover:bg-[#faeae6] hover:border-[#e7b8a8] shadow-2xs"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
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
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white px-3 py-1.5 text-xs font-semibold text-[#163f2c] transition hover:bg-[#f3f0e6] shadow-2xs"
          title="Sign in with Google to save audits and track your property history"
        >
          <LogIn className="h-3.5 w-3.5 text-[#2f7d3a]" />
          <span>Sign In</span>
        </button>
      )}
    </div>
  );
}
