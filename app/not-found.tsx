import Link from "next/link";

import { Container } from "@/components/layout/Container";

/** Custom 404 (spec §29). Missing content and, in production, draft URLs land here. */
export default function NotFound() {
  return (
    <Container width="prose" className="flex flex-col gap-5">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-lg text-muted text-pretty">
        That page does not exist, or it is not published yet.
      </p>
      <p className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/" className="text-accent underline underline-offset-4">
          Home
        </Link>
        <Link href="/blog" className="text-accent underline underline-offset-4">
          Blog
        </Link>
        <Link href="/learn" className="text-accent underline underline-offset-4">
          Learn
        </Link>
      </p>
    </Container>
  );
}
