const stats = [
  {
    value: "100%",
    label:
      "Runs offline. Your audio is transcribed on-device and never uploaded.",
  },
  {
    value: "~5x",
    label:
      "Real-time transcription speed on mid-range CPUs with the Parakeet model.",
  },
  {
    value: "$0",
    label: "Free and open source under the MIT license — forever.",
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
