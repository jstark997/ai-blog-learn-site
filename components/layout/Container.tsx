import { cn } from "@/lib/utils/cn";

const widths = {
  /** The page frame: headers, footers, index grids. */
  wide: "max-w-wide",
  /** The reading column for long-form prose (spec §27). */
  prose: "max-w-measure",
} as const;

type ContainerProps = {
  children: React.ReactNode;
  width?: keyof typeof widths;
  className?: string;
};

/** Centres content and applies the shared horizontal page gutter. */
export function Container({ children, width = "wide", className }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-gutter", widths[width], className)}>{children}</div>
  );
}
