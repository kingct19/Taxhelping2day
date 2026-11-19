import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { libraryArticles, libraryGroupLabel } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireProfile("staff");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-6">
        <div>
          <h1 className="text-base font-semibold">Articles</h1>
          <p className="text-xs text-muted-foreground">
            {libraryArticles.length} {libraryArticles.length === 1 ? "article" : "articles"}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">Articles</p>
                <p className="text-2xl font-medium tabular-nums">{libraryArticles.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-medium tabular-nums">{libraryArticles.filter((article) => article.group === "service").length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">The season</p>
                <p className="text-2xl font-medium tabular-nums">{libraryArticles.filter((article) => article.group === "season").length}</p>
              </CardContent>
            </Card>
          </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {libraryArticles.map((article) => (
              <TableRow key={article.slug}>
                <TableCell>
                  <Link href={`/library/${article.slug}`} className="font-medium underline">
                    {article.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{libraryGroupLabel(article.group)}</Badge>
                </TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">{article.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
