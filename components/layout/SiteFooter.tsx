import { site } from "@/lib/site";
import { Container } from "./Container";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {site.author}
        </p>
        <p>{site.description}</p>
      </Container>
    </footer>
  );
}
