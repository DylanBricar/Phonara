import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/features/form/submit-button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { api } from "@convex/_generated/api";
import { useMutation as useConvexMutation } from "convex/react";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

function CreateUserFormContent() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const createUser = useConvexMutation(api.admin.mutations.createUser);

  const createMutation = useQueryMutation({
    mutationFn: async () => {
      const name =
        [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
      const user = await createUser({
        email,
        password,
        name,
        role: "user",
      });
      return { user };
    },
    onSuccess: () => {
      toast.success("User created");
      dialogManager.closeAll();
    },
    onError: (error) => {
      toastClientError(error, "Failed to create user");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email || !password) return;
        createMutation.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
        />
      </div>

      <LoadingButton
        type="submit"
        loading={createMutation.isPending}
        className="w-full"
      >
        Create user
      </LoadingButton>
    </form>
  );
}

export function openCreateUserDialog() {
  dialogManager.custom({
    title: "Create user",
    description: "Create a new user account with email and password.",
    icon: UserPlus,
    size: "md",
    children: <CreateUserFormContent />,
  });
}
