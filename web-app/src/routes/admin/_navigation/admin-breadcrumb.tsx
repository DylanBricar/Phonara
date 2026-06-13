import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { Fragment } from "react";

export default function AdminBreadcrumb() {
  const { pathname } = useLocation();

  const paths = pathname.split("/").filter(Boolean);
  const basePath = "/admin";

  return (
    <Breadcrumb>
      <BreadcrumbList className="border-border bg-background h-8 rounded-lg border px-3 shadow-sm shadow-black/5">
        <BreadcrumbItem>
          <BreadcrumbLink href={basePath}>
            <Home size={16} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">Admin</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {paths.slice(1).map((path, index) => {
          const isLast = index === paths.slice(1).length - 1;
          const currentPath = `/${paths.slice(0, index + 2).join("/")}`;

          const displayName = path;

          return (
            <Fragment key={path + index}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {displayName}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={currentPath}
                    className="flex items-center gap-2"
                  >
                    {displayName}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
