import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";

import { cn } from "@/lib/utils";

function ToggleGroup<Value extends string = string>({
  className,
  orientation = "horizontal",
  ...props
}: ToggleGroupPrimitive.Props<Value>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      orientation={orientation}
      className={cn(
        "border-border/70 bg-muted/30 flex w-fit items-center gap-1 rounded-lg border p-1",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup };
