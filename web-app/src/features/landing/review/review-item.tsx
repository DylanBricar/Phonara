import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export type ReviewItemProps = {
  review: string;
  name: string;
  role: string;
  image: string;
} & ComponentPropsWithoutRef<"div">;

export const ReviewItem = ({ className, ...props }: ReviewItemProps) => {
  return (
    <div
      className={cn(
        "h-fit rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6",
        className,
      )}
      {...props}
    >
      <p className="text-sm leading-relaxed text-[#888]">
        {props.review.split(/\*\*(.*?)\*\*/).map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-medium text-[#fafafa]">
              {part}
            </strong>
          ) : (
            part
          ),
        )}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <img
          src={props.image}
          alt={props.name}
          className="size-8 rounded-full"
        />
        <div>
          <p className="text-sm font-medium text-[#fafafa]">{props.name}</p>
          <p className="text-xs text-[#666]">{props.role}</p>
        </div>
      </div>
    </div>
  );
};
