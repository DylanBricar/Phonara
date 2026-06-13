const stats = [
  {
    value: "Bubble",
    label: "Bottom-right chat entry point for each customer website.",
  },
  {
    value: "AI + human",
    label: "Conversation ownership can move from the agent to a teammate.",
  },
  {
    value: "Multi-site",
    label: "Customers can manage prompts and widgets across websites.",
  },
];

export function StatsSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.value}
            className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6"
          >
            <p className="font-elegant text-4xl tracking-tight text-[#fafafa]">
              {stat.value}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#888]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
