/** Local source data shaped like a CMS response, including unpublished records. */
interface ExampleArticle {
  slug: string;
  title: string;
  description: string;
  status: "published" | "draft";
  publishedAt: string;
  author: { name: string; role: string };
  tags: string[];
  readingMinutes: number;
  featured: boolean;
  related: { title: string; path: string }[];
  body: string;
}

const articles: ExampleArticle[] = [
  {
    slug: "example",
    title: "A field guide to public Markdown",
    description: "Publish structured metadata and rich Markdown from any server-side source.",
    status: "published",
    publishedAt: "2026-10-15T09:00:00.000Z",
    author: { name: "Alex Morgan", role: "Content engineer" },
    tags: ["Nuxt", "Markdown", "公開コンテンツ"],
    readingMinutes: 6,
    featured: true,
    related: [{ title: "Publication checklist", path: "/articles/checklist" }],
    body: `# A field guide to public Markdown

This article comes from a local, asynchronous source. The same definition could fetch a CMS record,
a database row, or an external service response.

## Keep metadata structured

The JSON response contains **frontmatter** and **body** as separate values. Only the raw Markdown
response serializes the metadata to YAML.

| Value | Example | YAML representation |
| --- | --- | --- |
| Boolean | Featured article | true |
| Number | Reading time | 6 |
| Null | No expiry date | null |
| String | Published date | An ISO date string |

## Publish deliberately

1. Fetch the requested record by its slug.
2. Return null for missing or unpublished records.
3. Transform only the public fields.
4. List public records without fetching every body.

> A published listing is a promise: readers should be able to retrieve the corresponding document.

### A small server definition

\`\`\`ts
export default defineMarkdownDocument({
  route: "/articles/:slug",
  fetch: ({ params }) => findPublicArticle(params.slug),
  transform: (article) => ({
    frontmatter: { title: article.title },
    body: article.markdown
  })
});
\`\`\`

---

## Links and Unicode

Read the [publication checklist](/articles/checklist.md), or visit
[Nuxt documentation](https://nuxt.com/docs). Unicode survives the complete response: café, 日本語, 🌍.

- Metadata can contain nested author details and arrays of related articles.
- Source content stays on the server until it is deliberately included in a public response.
- HTML pages and unrelated API endpoints remain available.
`
  },
  {
    slug: "checklist",
    title: "Publication checklist",
    description: "A compact second document with different metadata and a Markdown checklist.",
    status: "published",
    publishedAt: "2026-10-14T12:30:00.000Z",
    author: { name: "Sam Rivera", role: "Editor" },
    tags: ["Publishing", "Quality"],
    readingMinutes: 2,
    featured: false,
    related: [{ title: "Public Markdown guide", path: "/articles/example" }],
    body: `# Publication checklist

- [x] Include only published records in listings.
- [x] Return null for unpublished and missing records.
- [x] Keep credentials and private fields out of frontmatter.
- [x] Use ISO strings instead of Date objects.
- [x] Let the module write the single frontmatter block.

## Request a document

\`\`\`sh
curl -i http://localhost:3000/articles/checklist.md
\`\`\`
`
  },
  {
    slug: "draft",
    title: "Unpublished working notes",
    description: "This record must never be listed or returned by the public definition.",
    status: "draft",
    publishedAt: "",
    author: { name: "Alex Morgan", role: "Content engineer" },
    tags: [],
    readingMinutes: 0,
    featured: false,
    related: [],
    body: "PRIVATE_DRAFT_BODY_NOT_FOR_PUBLIC_DELIVERY"
  }
];

/**
 * Retrieves a single published source record without scanning the public listing.
 * @param slug Decoded route parameter.
 * @returns A public article or null for missing and unpublished records.
 */
export async function findPublicArticle(slug: string | undefined): Promise<ExampleArticle | null> {
  return (
    articles.find((article) => article.slug === slug && article.status === "published") ?? null
  );
}

/**
 * Lists metadata for published source records without retrieving document bodies.
 * @returns Canonical paths, titles and descriptions for the public documents.
 */
export async function listPublicArticles() {
  return articles
    .filter((article) => article.status === "published")
    .map(({ slug, title, description }) => ({ title, description, path: `/articles/${slug}` }));
}
