import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/nowts/typography";
import { BlogToolbar } from "@/features/posts/blog-toolbar";
import { PostCard } from "@/features/posts/post-card";
import { PostCardSkeleton } from "@/features/posts/post-card-skeleton";
import { breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { FileQuestion } from "lucide-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getPostsCategoryData = createServerFn({ method: "GET" })
  .inputValidator((category: string) => category)
  .handler(async ({ data: category }) => {
    const { getPosts, getPostsTags } =
      await import("@/features/posts/post-manager");
    const [allPosts, tags] = await Promise.all([getPosts(), getPostsTags()]);
    if (!tags.includes(category)) return null;
    const posts = allPosts.filter((post) =>
      post.attributes.tags?.includes(category),
    );
    return { posts, tags, category };
  });

const categoryLoader = async (category: string) =>
  getPostsCategoryData({ data: category });

export const Route = createFileRoute("/(layout)/posts/categories/$category/")({
  loader: async ({ params }) => {
    const data = await categoryLoader(params.category);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    ...createSeoHead({
      title: `${loaderData?.category ?? "Category"} Articles`,
      description: `Browse ${SiteConfig.title} blog articles tagged ${loaderData?.category ?? "category"}.`,
      path: `/posts/categories/${encodeURIComponent(loaderData?.category ?? "")}`,
      keywords: loaderData?.category ? [loaderData.category] : [],
      jsonLd: breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/posts" },
        {
          name: loaderData?.category ?? "Category",
          path: `/posts/categories/${encodeURIComponent(loaderData?.category ?? "")}`,
        },
      ]),
    }),
  }),
  component: CategoryPage,
  pendingComponent: CategoryPageSkeleton,
});

function CategoryPage() {
  const { posts, tags, category } = Route.useLoaderData();
  const featured = posts.slice(0, 2);
  const rest = posts.slice(2);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:py-20">
      <header className="flex flex-col gap-8">
        <Typography
          variant="h1"
          className="text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl"
        >
          Blog
        </Typography>
        <BlogToolbar tags={tags} activeCategory={category} />
      </header>

      {posts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            <EmptyTitle>No posts in this category</EmptyTitle>
            <EmptyDescription>
              Try another tag, or browse <Link to="/posts">all posts</Link>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-2">
            {featured.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </section>

          {rest.length > 0 && (
            <section className="flex flex-col gap-6">
              <Typography
                variant="h2"
                className="text-2xl font-semibold tracking-tight md:text-3xl"
              >
                More Articles
              </Typography>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CategoryPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:py-20">
      <header className="flex flex-col gap-8">
        <Skeleton className="h-16 w-40 md:h-20" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </section>

      <section className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
