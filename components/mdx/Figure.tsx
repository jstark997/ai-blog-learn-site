import Image from "next/image";

import { cn } from "@/lib/utils/cn";

type FigureProps = {
  /** A path under `/public`, e.g. `/images/learn/attention.png` (spec §21). */
  src: string;
  /** Required: an editorial image carries meaning. `""` marks a decorative one. */
  alt: string;
  /**
   * The image's intrinsic size, in pixels. `next/image` needs both to reserve
   * the space before the file loads, and an MDX file cannot import the asset to
   * have them inferred, so the author writes them: `width={1200} height={630}`.
   */
  width: number;
  height: number;
  caption?: React.ReactNode;
  /** For an image above the fold; leave it off for one inside an article. */
  priority?: boolean;
  className?: string;
};

/**
 * The one component that puts an image on a page (spec §21).
 *
 * Keeping every editorial image behind it is what makes the hosting trade-off
 * in spec §4.6 a one-file change: if the site is ever exported statically,
 * `images.unoptimized` is set once in `next.config.ts` and this file is the only
 * place that had to know about `next/image` at all.
 *
 * `sizes` describes the reading column, not the viewport: prose is at most
 * `--container-measure` wide, so the browser must not be told to fetch a
 * full-width image on a wide screen.
 */
export function Figure({
  src,
  alt,
  width,
  height,
  caption,
  priority = false,
  className,
}: FigureProps) {
  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(min-width: 48rem) 68ch, 100vw"
        className="h-auto w-full rounded-lg border border-rule"
      />
      {caption !== undefined && (
        <figcaption className="text-sm text-muted text-pretty">{caption}</figcaption>
      )}
    </figure>
  );
}
