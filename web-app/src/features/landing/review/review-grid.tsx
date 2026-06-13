import type { ReviewItemProps } from "./review-item";
import { ReviewItem } from "./review-item";

type ReviewGridProps = {
  reviews: ReviewItemProps[];
};

export const ReviewGrid = (props: ReviewGridProps) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {props.reviews.map((review) => (
          <ReviewItem
            {...review}
            key={review.image}
            className="mb-4 break-inside-avoid-column"
          />
        ))}
      </div>
    </section>
  );
};
