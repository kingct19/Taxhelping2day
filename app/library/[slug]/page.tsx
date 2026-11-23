import { notFound } from "next/navigation";
import { SubpageNav } from "@/components/subpage-nav";
import { requireProfile } from "@/lib/auth";
import { getLibraryArticle, libraryGroupLabel } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function LibraryArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireProfile("staff");
  const { slug } = await params;
  const article = getLibraryArticle(slug);
  if (!article) {
    notFound();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <SubpageNav
          backHref="/library"
          backLabel="Back to library"
          crumbs={[{ href: "/library", label: "Library" }, { label: article.title }]}
        />
      </div>
      <article className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{libraryGroupLabel(article.group)}</p>
          <p className="text-lg">{article.summary}</p>
          {article.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-6 text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
