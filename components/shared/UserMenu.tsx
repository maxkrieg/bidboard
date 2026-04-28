"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";
import { LogOut, ShieldCheck } from "lucide-react";

interface UserMenuProps {
  email: string;
  initial: string;
  isAdmin?: boolean;
}

export function UserMenu({ email, initial, isAdmin }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors">
          <span className="text-sm font-semibold text-indigo-700">{initial}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-xs text-zinc-500 truncate">
            {email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem className="p-0">
            <Link
              href="/admin"
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-zinc-700"
            >
              <ShieldCheck size={14} />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="p-0">
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-zinc-700"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
