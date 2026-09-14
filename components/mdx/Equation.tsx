import { cn } from "@/lib/utils/cn";

type EquationProps = {
  /** A block equation, written as `$$ … $$` markdown inside this component. */
  children: React.ReactNode;
  /** An equation number or tag, e.g. `(1)`, for prose to refer back to. */
  label?: string;
  caption?: React.ReactNode;
  className?: string;
};

/**
 * A labelled display equation.
 *
 * It does not typeset anything: `remark-math` and `rehype-katex` already do
 * that at build time for any `$$ … $$` block, wherever it appears (spec §20).
 * What this adds is the frame around one — a tag prose can cite, and a caption
 * saying in words what the notation says in symbols, which is the part a
 * screen reader can offer before it reaches the MathML KaTeX emits.
 *
 * Because MDX processes markdown inside a block-level component, the maths is
 * written as markdown, with blank lines around it:
 *
 * ```mdx
 * <Equation label="(1)" caption="Scaled dot-product attention.">
 *
 * $$
 * \operatorname{softmax}\!\left(\frac{Q K^{\top}}{\sqrt{d_k}}\right) V
 * $$
 *
 * </Equation>
 * ```
 *
 * The label is not `aria-hidden`: a reader following "as (1) showed" needs to
 * hear it. `.katex-display` already scrolls a wide equation rather than
 * widening the column (`app/globals.css`).
 */
export function Equation({ children, label, caption, className }: EquationProps) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-4">
        <div className="min-w-0 grow">{children}</div>
        {label !== undefined && (
          <span className="shrink-0 font-mono text-sm text-muted">{label}</span>
        )}
      </div>
      {caption !== undefined && (
        <figcaption className="text-sm text-muted text-pretty">{caption}</figcaption>
      )}
    </figure>
  );
}
