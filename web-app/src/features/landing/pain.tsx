import { SiteConfig } from "@/site-config";

export const PainSection = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="mb-12">
        <p className="mb-4 text-sm text-[#666]">The problem</p>
        <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
          Cloud dictation makes you pay
          <br />
          <span className="text-[#666] italic">with money and privacy.</span>
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
          <p className="mb-4 text-xs tracking-wider text-[#888] uppercase">
            The usual way
          </p>
          <p className="mb-6 text-[#666]">
            Most dictation tools stream your microphone to someone else's
            servers and charge you every month for the privilege.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              Your voice is uploaded and processed in the cloud
            </div>
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              Monthly subscriptions that never stop
            </div>
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              Useless the moment you lose internet
            </div>
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span className="text-red-500">-</span>
              Closed source — you can't see or change anything
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-6">
          <p className="mb-4 text-xs tracking-wider text-[#888] uppercase">
            The {SiteConfig.title} way
          </p>
          <p className="mb-6 text-[#fafafa]">
            {SiteConfig.title} runs the whole pipeline on your machine, free and
            open source, and pastes the result wherever you're typing.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Audio is transcribed locally and never leaves your device
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Free forever, no account, no subscription
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Works completely offline once a model is downloaded
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <span className="text-green-500">+</span>
              Open source — read it, fork it, make it yours
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
