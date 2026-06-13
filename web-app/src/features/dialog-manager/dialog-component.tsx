import { Typography } from "@/components/nowts/typography";
import {
  NowStackDialogContent,
  NowStackDialogEnterHint,
  NowStackDialogEscButton,
  NowStackDialogFooterBar,
  NowStackDialogHeader,
} from "@/components/nowts/dialog-nowstack";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "../form/submit-button";
import { handleDialogAction, useDialogStore } from "./dialog-store";
import type { Dialog as DialogType } from "./dialog-types";

export function DialogComponent(props: { dialog: DialogType }) {
  const { dialog } = props;
  const [confirmText, setConfirmText] = useState("");
  const [inputValue, setInputValue] = useState(
    dialog.type === "input" ? (dialog.input.defaultValue ?? "") : "",
  );

  const sizeClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-4xl",
  }[dialog.size ?? "md"];

  if (dialog.type === "custom") {
    const actionForm = dialog.action?.form;
    const handleClose = () => {
      if (dialog.cancel?.onClick) {
        void dialog.cancel.onClick();
      } else {
        useDialogStore.getState().removeDialog(dialog.id);
      }
    };

    const handleCustomAction = async () => {
      if (dialog.action?.onClick) {
        await handleDialogAction(dialog.id, dialog.action.onClick);
      }
    };

    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <NowStackDialogContent className={sizeClass}>
          {(dialog.title || dialog.description) && (
            <NowStackDialogHeader>
              {dialog.title && (
                <DialogTitle className="text-base">{dialog.title}</DialogTitle>
              )}
              {dialog.description && (
                <DialogDescription className="text-sm">
                  {dialog.description}
                </DialogDescription>
              )}
            </NowStackDialogHeader>
          )}
          <div className="flex flex-col gap-4 p-5">{dialog.children}</div>
          <NowStackDialogFooterBar>
            <NowStackDialogEscButton
              label={String(dialog.cancel?.label ?? "Close")}
              onClick={handleClose}
            />
            {dialog.action ? (
              <LoadingButton
                size="sm"
                loading={dialog.loading}
                disabled={dialog.loading}
                type={actionForm ? "submit" : "button"}
                form={actionForm}
                onClick={actionForm ? undefined : handleCustomAction}
                variant={dialog.action.variant ?? "default"}
              >
                {dialog.action.label}
              </LoadingButton>
            ) : (
              <span />
            )}
          </NowStackDialogFooterBar>
        </NowStackDialogContent>
      </Dialog>
    );
  }

  const isConfirmDisabled =
    dialog.type === "confirm" && dialog.confirmText
      ? confirmText !== dialog.confirmText
      : false;

  const handleAction = async () => {
    await handleDialogAction(dialog.id, async () =>
      dialog.action.onClick?.(dialog.type === "input" ? inputValue : undefined),
    );
  };

  const handleCancel = async () => {
    if (dialog.cancel?.onClick) {
      await dialog.cancel.onClick();
    } else {
      useDialogStore.getState().removeDialog(dialog.id);
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <NowStackDialogContent className={sizeClass}>
        <NowStackDialogHeader
          bordered={
            (dialog.type === "confirm" && Boolean(dialog.confirmText)) ||
            dialog.type === "input"
          }
          centered={dialog.style === "centered"}
        >
          {dialog.icon && (
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <dialog.icon className="size-6" />
            </div>
          )}
          <DialogTitle className="text-base">{dialog.title ?? ""}</DialogTitle>
          {typeof dialog.description === "string" ? (
            <DialogDescription className="text-sm">
              {dialog.description}
            </DialogDescription>
          ) : (
            dialog.description
          )}
        </NowStackDialogHeader>

        {((dialog.type === "confirm" && dialog.confirmText) ||
          dialog.type === "input") && (
          <div className="flex flex-col gap-4 p-5">
            {dialog.type === "confirm" && dialog.confirmText && (
              <div className="space-y-2">
                <Typography>
                  Type{" "}
                  <Typography
                    variant="code"
                    as="button"
                    type="button"
                    className="hover:bg-primary/20 cursor-pointer transition-colors"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        dialog.confirmText ?? "",
                      );
                      toast.success("Copied to clipboard");
                    }}
                  >
                    {dialog.confirmText}
                  </Typography>{" "}
                  to confirm this action.
                </Typography>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      if (!dialog.loading && !isConfirmDisabled) {
                        void handleAction();
                      }
                    }
                  }}
                />
              </div>
            )}

            {dialog.type === "input" && (
              <div className="space-y-2">
                <Label>{dialog.input.label}</Label>
                <Input
                  value={inputValue}
                  placeholder={dialog.input.placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  ref={(ref) => ref?.focus()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!dialog.loading && !isConfirmDisabled) {
                        void handleAction();
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        <NowStackDialogFooterBar>
          <NowStackDialogEscButton
            label={String(dialog.cancel?.label ?? "Cancel")}
            onClick={handleCancel}
          />
          <LoadingButton
            size="sm"
            loading={dialog.loading}
            disabled={dialog.loading || isConfirmDisabled}
            onClick={handleAction}
            variant={dialog.action.variant ?? "default"}
          >
            {dialog.action.label ?? "OK"}
            {!dialog.loading &&
              !isConfirmDisabled &&
              (dialog.type === "input" || dialog.confirmText) && (
                <NowStackDialogEnterHint />
              )}
          </LoadingButton>
        </NowStackDialogFooterBar>
      </NowStackDialogContent>
    </Dialog>
  );
}
