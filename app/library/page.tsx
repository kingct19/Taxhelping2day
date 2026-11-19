import { requireProfile } from "@/lib/auth";
import { AuthorityBrowser } from "@/components/library/authority-browser";
import { libraryArticles } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireProfile("staff");
  const firm = libraryArticles.map((article) => ({
    cite: article.title,
    title: article.summary,
    href: `/library/${article.slug}`,
  }));

  return <AuthorityBrowser firm={firm} />;
}
