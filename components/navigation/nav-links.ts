/**
 * The primary public navigation (spec §7). Home, Blog, Learn, About — no Labs
 * or Demos page; interactive material lives inside Learn.
 *
 * Declared once and consumed by every navigation surface, so the desktop and
 * mobile menus cannot drift apart.
 */
export type NavItem = {
  readonly href: string;
  readonly label: string;
};

export const navItems: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/learn", label: "Learn" },
  { href: "/about", label: "About" },
];

/**
 * Whether `href` is the section the visitor is currently in. `/` matches only
 * itself; every other entry also matches its descendants, so an article at
 * `/blog/why-machines-learn` still marks Blog as current.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
