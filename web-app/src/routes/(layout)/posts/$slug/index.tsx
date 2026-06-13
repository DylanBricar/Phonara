import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/nowts/typography";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { calculateReadingTime } from "@/features/posts/calculate-reading-time";
import { PostCard } from "@/features/posts/post-card";
import { PostCardSkeleton } from "@/features/posts/post-card-skeleton";
import { formatDate } from "@/lib/format/date";
import { articleJsonLd, breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getPostPageData = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { getCurrentPost, getPosts } =
      await import("@/features/posts/post-manager");
    const [post, allPosts] = await Promise.all([
      getCurrentPost(slug),
      getPosts(),
    ]);
    if (!post) return null;
    const relatedPosts = allPosts.filter((p) => p.slug !== slug).slice(0, 3);
    return { post, relatedPosts };
  });

const postSlugLoader = async (slug: string) => getPostPageData({ data: slug });

export const Route = createFileRoute("/(layout)/posts/$slug/")({
  loader: async ({ params }) => {
    const data = await postSlugLoader(params.slug);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    const title = post?.attributes.title ?? "Post";
    const description = post?.attributes.description;
    const path = `/posts/${post?.slug ?? ""}`;

    return createSeoHead({
      title,
      description,
      path,
      type: "article",
      image: post?.attributes.coverUrl,
      keywords: post?.attributes.keywords,
      tags: post?.attributes.tags,
      section: "Blog",
      publishedTime: post?.attributes.date,
      modifiedTime: post?.attributes.date,
      jsonLd: post
        ? [
            articleJsonLd({
              type: "BlogPosting",
              title,
              description: post.attributes.description,
              path,
              image: post.attributes.coverUrl,
              datePublished: post.attributes.date,
              dateModified: post.attributes.date,
              keywords: post.attributes.keywords,
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/posts" },
              { name: title, path },
            ]),
          ]
        : undefined,
    });
  },
  component: PostDetailPage,
  pendingComponent: PostDetailSkeleton,
});

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        {label}
      </span>
      <span className="text-foreground text-sm">{children}</span>
    </div>
  );
}

function PostDetailPage() {
  const { post, relatedPosts } = Route.useLoaderData();
  const readingTime = calculateReadingTime(post.content);
  const firstTag = post.attributes.tags?.[0];

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 lg:py-20">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
      >
        <Link to="/posts" className="hover:text-foreground transition-colors">
          Blog
        </Link>
        {firstTag ? (
          <>
            <span className="text-muted-foreground/40">/</span>
            <Link
              to="/posts/categories/$category"
              params={{ category: firstTag }}
              className="text-foreground hover:underline"
            >
              {firstTag}
            </Link>
          </>
        ) : null}
      </nav>

      <Typography
        variant="h1"
        className="text-center text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl lg:text-6xl"
      >
        {post.attributes.title}
      </Typography>

      {post.attributes.coverUrl ? (
        <img
          src={post.attributes.coverUrl}
          alt={post.attributes.title}
          className="border-border aspect-video w-full rounded-xl border object-cover"
          width={1200}
          height={630}
          sizes="(max-width: 896px) 100vw, 896px"
          decoding="async"
          fetchPriority="high"
        />
      ) : null}

      {post.attributes.description ? (
        <p className="text-foreground text-lg leading-relaxed">
          {post.attributes.description}
        </p>
      ) : null}

      <div className="border-border grid grid-cols-1 gap-6 border-y py-6 sm:grid-cols-3">
        <MetaCell label="Date">{formatDate(post.attributes.date)}</MetaCell>
        <MetaCell label="Author">{SiteConfig.team.name}</MetaCell>
        <MetaCell label="Reading time">{readingTime} min read</MetaCell>
      </div>

      <div className="typography">
        <ServerMdx source={post.content} />
      </div>

      {relatedPosts.length > 0 && (
        <section className="border-border mt-8 flex flex-col gap-6 border-t pt-10">
          <Typography
            variant="h2"
            className="text-2xl font-semibold tracking-tight md:text-3xl"
          >
            Related Posts
          </Typography>
          <div className="flex flex-col gap-3">
            {relatedPosts.map((p) => (
              <PostCard key={p.slug} post={p} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function PostDetailSkeleton() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 lg:py-20">
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-12 w-2/3" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="grid grid-cols-1 gap-6 border-y py-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <section className="mt-8 flex flex-col gap-6 border-t pt-10">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      </section>
    </article>
  );
}
