/* eslint-disable @typescript-eslint/no-explicit-any */

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import type * as React from "react";
import type { z } from "zod";

import type { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription as FieldDescriptionComponent,
  FieldError,
  FieldLabel as FieldLabelComponent,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "./submit-button";

/**
 * TanStack Form context exports for advanced field/form access
 *
 * @description
 * - `useFieldContext<T>()` - Access current field state inside custom field components
 * - `useFormContext()` - Access form instance from anywhere in the form tree
 * - `fieldContext` / `formContext` - Raw context objects (rarely needed)
 *
 * Use `useFieldContext` when building custom field components that need field state.
 * Use `useFormContext` for custom components that need to read/write form state.
 *
 * @example
 * // Custom field component using field context
 * function CustomDatePicker(props: DatePickerProps) {
 *   const field = useFieldContext<Date>();
 *   return (
 *     <DatePicker
 *       value={field.state.value}
 *       onChange={(date) => field.handleChange(date)}
 *     />
 *   );
 * }
 */
export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

/**
 * Form submit button with automatic loading state
 *
 * @description
 * Shows loading spinner automatically when form is submitting.
 * Use inside Form component or access via `form.SubmitButton` (preferred).
 *
 * @example
 * // Preferred: Use via form instance
 * <form.SubmitButton>Save</form.SubmitButton>
 *
 * // With size/variant props
 * <form.SubmitButton size="lg" variant="outline">Create</form.SubmitButton>
 */
export function SubmitButton(props: React.ComponentProps<typeof Button>) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <LoadingButton type="submit" loading={isSubmitting} {...props} />
      )}
    </form.Subscribe>
  );
}

function FormInput(props: React.ComponentProps<typeof Input>) {
  const field = useFieldContext<string>();

  return (
    <Input
      id={field.name}
      name={field.name}
      value={field.state.value}
      placeholder={props.placeholder}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value)}
      {...props}
    />
  );
}

function FormSelect(props: React.ComponentProps<typeof Select>) {
  const field = useFieldContext<string>();
  return (
    <Select
      name={field.name}
      value={field.state.value}
      onValueChange={(value) => field.handleChange(value as string)}
      {...props}
    />
  );
}

function FormTextarea(props: React.ComponentProps<typeof Textarea>) {
  const field = useFieldContext<string>();
  return (
    <Textarea
      id={field.name}
      name={field.name}
      value={field.state.value}
      placeholder={props.placeholder}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value)}
      {...props}
    />
  );
}

function FormCheckbox(props: React.ComponentProps<typeof Checkbox>) {
  const field = useFieldContext<boolean>();
  return (
    <Checkbox
      id={field.name}
      name={field.name}
      checked={Boolean(field.state.value)}
      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
      {...props}
    />
  );
}

function FormSwitch(props: React.ComponentProps<typeof Switch>) {
  const field = useFieldContext<boolean>();
  return (
    <Switch
      id={field.name}
      name={field.name}
      checked={Boolean(field.state.value)}
      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
      {...props}
    />
  );
}

function useFieldInvalid() {
  const field = useFieldContext<string>();
  const form = useFormContext();

  return (
    field.state.meta.isTouched &&
    !field.state.meta.isValid &&
    form.state.submissionAttempts > 0
  );
}

function FieldField(props: React.ComponentProps<typeof Field>) {
  const isInvalid = useFieldInvalid();
  return <Field {...props} data-invalid={isInvalid} />;
}

/**
 * Low-level form hook with pre-configured field components
 *
 * @description
 * Internal hook created by createFormHook with all field components pre-registered.
 * **Prefer using `useForm` instead** - it provides a simpler API with Zod integration.
 *
 * Only use `useAppForm` if you need direct access to TanStack Form's raw API
 * without the Zod validation wrapper.
 */
export const { useAppForm } = createFormHook({
  fieldComponents: {
    Input: FormInput,
    Select: FormSelect,
    Textarea: FormTextarea,
    Checkbox: FormCheckbox,
    Switch: FormSwitch,
    Label: FieldLabel,
    Description: FieldDescription,
    Message: FieldMessage,
    Field: FieldField,
    Content: FieldContent,
  },
  formComponents: {
    SubmitButton: SubmitButton,
  },
  fieldContext,
  formContext,
});

/**
 * Create a type-safe form with Zod validation
 *
 * @description
 * Primary hook for creating forms. Returns a form instance with:
 * - `form.AppField` - Render fields with built-in components (Input, Select, Textarea, Checkbox, Switch)
 * - `form.SubmitButton` - Submit button with automatic loading state
 * - `form.Subscribe` - Subscribe to form state changes
 * - `form.setFieldValue(name, value)` - Programmatically set field values
 * - `form.store.state.values` - Access current form values
 *
 * Field components available inside `form.AppField`:
 * - `field.Input`, `field.Textarea`, `field.Select`, `field.Checkbox`, `field.Switch`
 * - `field.Label`, `field.Description`, `field.Message`, `field.Field`, `field.Content`
 *
 * @example
 * // Basic form with validation
 * const form = useForm({
 *   schema: z.object({
 *     email: z.string().email(),
 *     name: z.string().min(2),
 *   }),
 *   defaultValues: { email: "", name: "" },
 *   onSubmit: async (values) => {
 *     await saveUser(values);
 *   },
 * });
 *
 * @example
 * // With async mutation
 * const form = useForm({
 *   schema: MySchema,
 *   defaultValues: { ... },
 *   onSubmit: async (values) => {
 *     await saveUser(values);
 *   },
 * });
 *
 * @example
 * // Programmatic field updates
 * <field.Input
 *   onChange={(e) => {
 *     field.handleChange(e.target.value);
 *     form.setFieldValue("slug", formatSlug(e.target.value));
 *   }}
 * />
 *
 * @param options.schema - Zod schema for validation and type inference
 * @param options.defaultValues - Initial form values (must match schema shape)
 * @param options.onSubmit - Called with validated values on form submit
 * @param options.validationMode - When to validate: "onBlur" (default), "onChange", "onSubmit"
 */
export function useForm<TSchema extends z.ZodType>({
  schema,
  defaultValues,
  onSubmit,
  validationMode = "onBlur",
}: {
  schema: TSchema;
  defaultValues: z.infer<TSchema>;
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>;
  validationMode?: "onChange" | "onBlur" | "onSubmit";
}) {
  return useAppForm({
    defaultValues,
    validators: {
      [validationMode]: schema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as z.infer<TSchema>);
    },
  });
}

/**
 * Form wrapper that provides context and handles submission
 *
 * @description
 * Wraps form content, provides form context to children, and handles
 * form submission with preventDefault automatically.
 *
 * @example
 * // Standard form structure
 * <Form form={form} className="flex flex-col gap-4">
 *   <form.AppField name="email">
 *     {(field) => (
 *       <field.Field>
 *         <field.Label>Email</field.Label>
 *         <field.Content>
 *           <field.Input type="email" placeholder="you@example.com" />
 *           <field.Message />
 *         </field.Content>
 *       </field.Field>
 *     )}
 *   </form.AppField>
 *
 *   <form.AppField name="role">
 *     {(field) => (
 *       <field.Field>
 *         <field.Label>Role</field.Label>
 *         <field.Content>
 *           <field.Select>
 *             <SelectTrigger><SelectValue /></SelectTrigger>
 *             <SelectContent>
 *               <SelectItem value="admin">Admin</SelectItem>
 *               <SelectItem value="member">Member</SelectItem>
 *             </SelectContent>
 *           </field.Select>
 *           <field.Message />
 *         </field.Content>
 *       </field.Field>
 *     )}
 *   </form.AppField>
 *
 *   <form.SubmitButton>Submit</form.SubmitButton>
 * </Form>
 *
 * @example
 * // With async field validation
 * <form.AppField
 *   name="slug"
 *   asyncDebounceMs={300}
 *   validators={{
 *     onChangeAsync: async ({ value }) => {
 *       const exists = await checkSlugExists(value);
 *       return exists ? "Slug already taken" : undefined;
 *     },
 *   }}
 * >
 *   {(field) => <field.Input />}
 * </form.AppField>
 *
 * @param props.form - Form instance from useForm()
 * @param props.children - Form content (fields, submit button)
 */
export function Form({
  children,
  form,
  ...props
}: {
  children: React.ReactNode;
  form: ReturnType<typeof useForm<any>>;
} & Omit<React.ComponentProps<"form">, "onSubmit">) {
  return (
    <form.AppForm>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        {...props}
      >
        {children}
      </form>
    </form.AppForm>
  );
}

function FieldLabel(props: React.ComponentProps<typeof FieldLabelComponent>) {
  const field = useFieldContext<string>();

  return <FieldLabelComponent htmlFor={field.name} {...props} />;
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<typeof FieldDescriptionComponent>) {
  const field = useFieldContext<string>();

  return (
    <FieldDescriptionComponent
      id={`${field.name}-form-item-description`}
      className={className}
      {...props}
    />
  );
}

function FieldMessage(props: React.ComponentProps<typeof FieldError>) {
  const field = useFieldContext<string>();
  const isInvalid = useFieldInvalid();

  const formattedErrors = field.state.meta.errors.map((error) => {
    if (typeof error === "string") {
      return { message: error };
    }
    return error as { message?: string };
  });

  return (
    <>{isInvalid ? <FieldError {...props} errors={formattedErrors} /> : null}</>
  );
}
