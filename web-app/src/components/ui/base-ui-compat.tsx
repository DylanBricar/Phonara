import * as React from "react";
import type { useRender } from "@base-ui/react/use-render";

type RenderProp<State = Record<string, unknown>> = useRender.RenderProp<State>;

export type AsChildProps<State = Record<string, unknown>> = {
  asChild?: boolean;
  children?: React.ReactNode;
  render?: RenderProp<State>;
};

export function getRenderFromAsChild<State = Record<string, unknown>>(
  asChild: boolean | undefined,
  children: React.ReactNode,
  render?: RenderProp<State>,
) {
  return asChild && React.isValidElement(children) ? children : render;
}

export function getChildrenFromAsChild(
  asChild: boolean | undefined,
  children: React.ReactNode,
): React.ReactNode {
  return asChild && React.isValidElement(children) ? undefined : children;
}
