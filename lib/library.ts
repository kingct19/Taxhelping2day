import { documentsToBring, services, steps } from "@/lib/site-content";

export type LibraryGroup = "service" | "season";

export type LibraryArticle = {
  slug: string;
  title: string;
  summary: string;
  group: LibraryGroup;
  paragraphs: string[];
};

const seasonArticle: LibraryArticle = {
  slug: "how-the-season-works",
  title: "How the season works",
  summary: "The path from the first conversation to a reviewed return.",
  group: "season",
  paragraphs: steps.map((step) => `${step.title}. ${step.body}`),
};

const bringArticle: LibraryArticle = {
  slug: "what-to-bring",
  title: "What to bring",
  summary: "The records a client sends before preparation starts.",
  group: "season",
  paragraphs: documentsToBring.map((item) => `${item.name}. ${item.detail}`),
};

export const libraryArticles: LibraryArticle[] = [
  seasonArticle,
  bringArticle,
  ...services.map((service) => ({
    slug: service.slug,
    title: service.title,
    summary: service.summary,
    group: "service" as const,
    paragraphs: [
      service.lede,
      ...service.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
      ...service.includes.map((item) => `${item.title}. ${item.body}`),
    ],
  })),
];

export function getLibraryArticle(slug: string) {
  return libraryArticles.find((article) => article.slug === slug);
}

export function libraryGroupLabel(group: LibraryGroup) {
  switch (group) {
    case "service":
      return "Services";
    case "season":
      return "The season";
    default: {
      const exhaustive: never = group;
      return exhaustive;
    }
  }
}
