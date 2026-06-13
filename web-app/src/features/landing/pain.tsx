import { SiteConfig } from "@/site-config";

export const PainSection = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="mb-12">
        <p className="mb-4 text-sm text-[#666]">The problem</p>
        <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
          Website support
          <br />
          <span className="text-[#666] italic">gets fragmented fast.</span>
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
          <p className="mb-4 text-xs tracking-wider text-[#888] uppercase">
            The old way
          </p>
          <p className="mb-6 text-[#666]">
            Visitors ask questions on your site, but the context, messages, and
            handoff path often live across disconnected tools.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              No clear AI or human owner for the next reply
            </div>
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              One-off widgets configured separately per website
            </div>
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              Prompts that do not match the site or support workflow
            </div>
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              Conversations that are hard for humans to take over
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-6">
          <p className="mb-4 text-xs tracking-wider text-[#888] uppercase">
            The new way
          </p>
          <p className="mb-6 text-[#fafafa]">
            Start from {SiteConfig.title}, configure the product-specific
            workflow, and keep auth, billing, organizations, content, and admin
            surfaces tied together.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Launch with a complete SaaS and mobile foundation
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Adapt the product workflow per organization or workspace
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Keep billing, docs, admin, and account flows integrated
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Let teammates operate from the same workspace
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
