type ReviewSingleProps = {
  image: string;
  review: string;
  name: string;
  role: string;
  compagnyImage?: string;
};

export const ReviewSingle = (props: ReviewSingleProps) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="flex flex-col items-center gap-8">
        <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-[#888] italic">
          {props.review.split(/\*\*(.*?)\*\*/).map((part, i) =>
            i % 2 === 1 ? (
              <strong key={i} className="font-medium text-[#fafafa] not-italic">
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
        <div className="flex items-center gap-3">
          <img
            src={props.image}
            alt={props.name}
            className="size-10 rounded-full"
          />
          <div>
            <p className="text-sm font-medium text-[#fafafa]">{props.name}</p>
            <p className="text-xs text-[#666]">{props.role}</p>
          </div>
          {props.compagnyImage ? (
            <img
              src={props.compagnyImage}
              className="size-8 object-contain"
              alt={props.name}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
};
