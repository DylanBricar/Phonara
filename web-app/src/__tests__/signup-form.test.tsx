import { authClient } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpCredentialsForm } from "@/routes/auth/signup/sign-up-credentials-form";
import { setup } from "../test/setup";

describe("SignUpCredentialsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:3000",
        href: "http://localhost:3000/auth/signup",
        search: "",
      },
      writable: true,
    });

    vi.mocked(authClient.signUp.email).mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  it("should render all form fields", async () => {
    setup(<SignUpCredentialsForm callbackUrl="/orgs" />);

    // Check all fields are rendered
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verify password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();
  });

  it("should show error when passwords don't match", async () => {
    const { user } = setup(<SignUpCredentialsForm callbackUrl="/orgs" />);

    // Fill the form with mismatched passwords
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/verify password/i), "password456");

    // Submit the form
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Should show error message via toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Password does not match");
    });

    // Should not call signup API
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  it("should submit form and redirect on successful signup", async () => {
    const { user } = setup(<SignUpCredentialsForm callbackUrl="/orgs" />);

    // Fill all fields correctly
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/verify password/i), "password123");

    // Submit the form
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Verify API was called with correct data
    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "password123",
        name: "John Doe",
        image: "",
      });
    });

    await waitFor(() => {
      expect(useRouter().navigate).toHaveBeenCalledWith({ to: "/orgs" });
    });
    expect(window.location.href).toBe("http://localhost:3000/auth/signup");
  });

  it("should use the normalized callback URL from props", async () => {
    const { user } = setup(<SignUpCredentialsForm callbackUrl="/dashboard" />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/verify password/i), "password123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(useRouter().navigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
    expect(window.location.href).toBe("http://localhost:3000/auth/signup");
  });
});
