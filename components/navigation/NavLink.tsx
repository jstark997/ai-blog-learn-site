"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";
import { isActivePath } from "./nav-links";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  /** Applied in every state. */
  className?: string;
  /** Applied only while this link is the current section. */
  activeClassName?: string;
  /** Applied only while it is not. */
  inactiveClassName?: string;
  onClick?: () => void;
};

/**
 * A navigation link that knows whether it is the current section, and says so
 * to assistive technology with `aria-current` rather than colour alone.
 *
 * This is the only Client Component the shell needs: `usePathname` is the sole
 * reason for it, and the header and footer around it stay server-rendered.
 */
export function NavLink({
  href,
  children,
  className,
  activeClassName,
  inactiveClassName,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
    >
      {children}
    </Link>
  );
}
