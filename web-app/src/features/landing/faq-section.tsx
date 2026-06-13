type Faq = {
  question: string;
  answer: string;
};

type FaqSectionProps = {
  faq: Faq[];
};

export const FAQSection = (props: FaqSectionProps) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28" id="faq">
      <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
        Questions <em>& answers</em>
      </h2>

      <div className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
        {props.faq.map((faq) => (
          <div key={faq.question}>
            <h3 className="text-[15px] font-medium text-[#fafafa]">
              {faq.question}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#888]">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
