import type { ReviewItemProps } from "./review-item";
import { ReviewItem } from "./review-item";

type ReviewTripleProps = {
  reviews: [ReviewItemProps, ReviewItemProps, ReviewItemProps];
};

export const ReviewTriple = (props: ReviewTripleProps) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {props.reviews.map((review) => (
          <ReviewItem {...review} key={review.image} />
        ))}
      </div>
    </section>
  );
};
