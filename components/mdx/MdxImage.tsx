/**
 * The `img` override (spec §15): markdown's `![alt](src)`.
 *
 * A plain `<img>`, deliberately. Markdown image syntax carries no intrinsic
 * width or height, and an MDX file may not import the asset to have them
 * inferred, so `next/image` — which needs both to reserve the space — has
 * nothing to work with here. `<Figure>` is the optimized path, and takes the
 * dimensions as props; this exists so that an ordinary markdown image still
 * renders, lazily and without shifting the layout of the text around it.
 *
 * `alt` defaults to `""`: `![](diagram.png)` is an image the author gave no
 * description, which is the empty-alt case, and inventing one would be worse.
 */
export function MdxImage({ alt = "", ...props }: React.ComponentPropsWithoutRef<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see above: no intrinsic size, so `next/image` cannot be used. `<Figure>` is the optimized path.
    <img
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-auto max-w-full rounded-lg border border-rule"
      {...props}
    />
  );
}
