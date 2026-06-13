/* eslint-disable @typescript-eslint/no-explicit-any */

import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { useWarnIfUnsavedChanges } from "@/hooks/use-warn-if-unsaved-changes";
import { createContext, Fragment, use, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { useForm } from "./tanstack-form";
import { Form } from "./tanstack-form";

const FormAutoSaveContext = createContext<{
  isDirty: boolean;
  isLoading: boolean;
  cancel: () => void;
  submit: () => void;
} | null>(null);

export const useFormAutoSave = () => {
  const ctx = use(FormAutoSaveContext);

  if (!ctx) {
    throw new Error("FormUnsavedBarContext is not provided");
  }

  return ctx;
};

export const FormAutoSave = ({
  children,
  form,
}: {
  children: React.ReactNode;
  form: ReturnType<typeof useForm<any>>;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submit = () => {
    buttonRef.current?.click();
  };
  const cancel = () => form.reset();
  const isDirty = form.state.isDirty;

  useHotkeys("mod+s", submit, {
    enabled: isDirty,
    enableOnContentEditable: true,
    preventDefault: true,
    enableOnFormTags: true,
  });

  useWarnIfUnsavedChanges(
    isDirty,
    "You have unsaved changes. Are you sure you want to leave?",
  );

  return (
    <FormAutoSaveContext.Provider
      value={{
        isDirty,
        isLoading: form.state.isSubmitting,
        cancel,
        submit,
      }}
    >
      <Fragment>
        <Form form={form}>
          {children}
          <button type="submit" className="hidden" ref={buttonRef} />
        </Form>
      </Fragment>
    </FormAutoSaveContext.Provider>
  );
};

export const FormAutoSaveWatch = (props: {
  autoSaveMs?: number;
  form: ReturnType<typeof useForm<any>>;
}) => {
  const lastFormStateRef = useRef<string | null>(null);

  const ctx = useFormAutoSave();

  const debounce = useDebounceFn(() => {
    const json = JSON.stringify(props.form.store.state.values);
    if (json === lastFormStateRef.current) return;
    lastFormStateRef.current = json;

    ctx.submit();
  }, props.autoSaveMs ?? 300);

  useEffect(() => {
    const sub = props.form.store.subscribe(() => {
      debounce();
    });
    return () => sub.unsubscribe();
  }, [props.form.store, debounce]);

  return null;
};
