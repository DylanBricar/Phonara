import { Link } from "@tanstack/react-router";
import type * as React from "react";

type CreateOrganizationLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>;

export function CreateOrganizationLink({
  children,
  ...props
}: CreateOrganizationLinkProps) {
  return (
    <Link
      {...props}
      to="."
      search={(previous) => ({
        ...previous,
        modal: "create-organization",
      })}
      mask={{ to: "/orgs/new", unmaskOnReload: true }}
      resetScroll={false}
    >
      {children}
    </Link>
  );
}
