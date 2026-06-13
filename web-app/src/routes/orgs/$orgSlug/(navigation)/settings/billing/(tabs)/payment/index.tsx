import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dayjs } from "@/lib/dayjs";
import { useAsyncQuery } from "@/hooks/use-async-query";
import { createNoIndexHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { Download, Receipt } from "lucide-react";
import { SiteConfig } from "@/site-config";

function formatCurrency(amount: number, currency?: string | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-emerald-500";
    case "open":
      return "bg-blue-500";
    case "draft":
      return "bg-muted-foreground/50";
    case "uncollectible":
      return "bg-destructive";
    case "void":
      return "bg-muted-foreground/30";
    default:
      return "bg-muted-foreground/50";
  }
}

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/billing/(tabs)/payment/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Payment",
      description: `Review ${SiteConfig.title} organization payment history.`,
      path: `/orgs/${params.orgSlug}/settings/billing/payment`,
      section: "Orgs",
    }),
  component: PaymentPage,
  pendingComponent: PaymentSkeleton,
});

function PaymentSkeleton() {
  return (
    <div className="bg-card flex flex-col rounded-xl border shadow-sm">
      <div className="flex flex-col gap-1.5 p-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex flex-col gap-3 p-6 pt-0">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

function PaymentPage() {
  const { orgSlug } = Route.useParams();
  const getOrganizationInvoices = useAction(
    api.stripe.actions.getOrganizationInvoices,
  );
  const { data, isLoading } = useAsyncQuery({
    queryKey: ["org-invoices", orgSlug],
    queryFn: async () =>
      getOrganizationInvoices({ organizationSlug: orgSlug, limit: 12 }),
  });

  const invoices = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
        <CardDescription>
          Your past invoices and payment history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-muted-foreground flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <Receipt className="text-muted-foreground size-8" />
            <div>
              <Typography variant="muted">No invoices yet</Typography>
              <Typography variant="small" className="text-muted-foreground">
                Invoices will appear here after your first payment.
              </Typography>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.number ?? `#${invoice.id.slice(-8)}`}
                  </TableCell>
                  <TableCell>
                    {dayjs.unix(invoice.created).format("MMM D, YYYY")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          getStatusColor(invoice.status),
                        )}
                        aria-hidden="true"
                      />
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    {invoice.invoicePdf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="size-4" />
                          PDF
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
