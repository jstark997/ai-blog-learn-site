import { cn } from "@/lib/utils/cn";
import { NavLink } from "./NavLink";
import { navItems } from "./nav-links";

/** The horizontal navigation shown from the `md` breakpoint upward. */
export function MainNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent-soft hover:text-accent",
              )}
              activeClassName="bg-accent-soft text-accent"
              inactiveClassName="text-muted"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
