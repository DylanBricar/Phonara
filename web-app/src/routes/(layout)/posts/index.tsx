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
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const postsSeoHead = createSeoHead({
  title: "Blog",
  description: `Read practical SaaS, authentication, billing, and product-building articles from the ${SiteConfig.title} team.`,
  path: "/posts",
  jsonLd: breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/posts" },
  ]),
});

const getPostsPageData = createServerFn({ method: "GET" }).handler(async () => {
  const { getPosts, getPostsTags } =
    await import("@/features/posts/post-manager");
  const [posts, tags] = await Promise.all([getPosts(), getPostsTags()]);
  return { posts, tags };
});

const postsLoader = async () => {
  return getPostsPageData();
};

export const Route = createFileRoute("/(layout)/posts/")({
  loader: postsLoader,
  head: () => postsSeoHead,
  component: PostsPage,
  pendingComponent: PostsPageSkeleton,
});

function PostsPage() {
  const { posts, tags } = Route.useLoaderData();
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
        <BlogToolbar tags={tags} />
      </header>

      {posts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            <EmptyTitle>No posts yet</EmptyTitle>
            <EmptyDescription>
              Check back soon for our first articles.
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

function PostsPageSkeleton() {
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
