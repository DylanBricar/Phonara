import { buttonVariants } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { AuthButton } from "../auth/auth-button";
import { HeaderBase } from "./header-base";

export function Header() {
  return (
    <HeaderBase>
      <Link
        to="/docs"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Docs
      </Link>
      <Link
        to="/about"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        About
      </Link>
      <Link
        to="/contact"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Contact
      </Link>
      <AuthButton />
    </HeaderBase>
  );
}
