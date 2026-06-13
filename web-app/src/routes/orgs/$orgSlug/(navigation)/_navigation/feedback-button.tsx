import { Button } from "@/components/ui/button";
import { ContactFeedbackPopover } from "@/features/contact/feedback/contact-feedback-popover";
import { MessageSquare } from "lucide-react";

export function FeedbackButton() {
  return (
    <ContactFeedbackPopover>
      <Button size="icon-sm" variant="outline">
        <MessageSquare />
      </Button>
    </ContactFeedbackPopover>
  );
}
