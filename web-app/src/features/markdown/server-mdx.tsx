import { cn } from "@/lib/utils";
import Markdown from "markdown-to-jsx";

type ServerMdxProps = {
  source: string;
  className?: string;
};

export const ServerMdx = (props: ServerMdxProps) => {
  return (
    <div className={cn("typography", props.className)}>
      <Markdown>{props.source}</Markdown>
    </div>
  );
};
