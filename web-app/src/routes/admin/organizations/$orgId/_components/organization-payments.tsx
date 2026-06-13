import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Subscription } from "@/lib/auth/stripe/auth-plans";
import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { isActiveSubscriptionStatus } from "@/lib/billing/subscription-status";
import { dayjs } from "@/lib/dayjs";
import { useAsyncQuery } from "@/hooks/use-async-query";
import { upfetch } from "@/lib/up-fetch";
import { Calendar, CreditCard, DollarSign } from "lucide-react";
import { z } from "zod";
import { LinkStripeCustomer } from "./link-stripe-customer";

const PaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  created: z.number(),
  description: z.string(),
  invoice: z
    .object({
      invoice_pdf: z.string().optional(),
    })
    .optional(),
});

type PaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

const CARD_BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
};

export function OrganizationPayments({
  organizationId,
  subscription,
  paymentMethod,
  stripeCustomerId,
}: {
  organizationId: string;
  subscription: Subscription | null;
  paymentMethod: PaymentMethod | null;
  stripeCustomerId: string | null;
}) {
  const { data: payments = [], isLoading: loading } = useAsyncQuery({
    queryKey: ["admin", "organization-payments", organizationId],
    queryFn: async () => {
      const data = await upfetch(
        `/api/admin/organizations/${organizationId}/payments`,
        {
          schema: z.object({ payments: z.array(PaymentSchema) }),
        },
      );
      return data.payments;
    },
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "succeeded":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const hasActiveSubscription =
    subscription && isActiveSubscriptionStatus(subscription.status);

  const currentPlan = AUTH_PLANS.find((p) => p.name === subscription?.plan);
  const nextPaymentAmount = currentPlan?.price ?? 0;

  return (
    <Card className="border-border/70 border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Billing
        </CardTitle>
        <CardDescription>
          Stripe customer, payment method, and invoice history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No Stripe Customer */}
        {!stripeCustomerId && (
          <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
            <span className="text-muted-foreground text-sm">
              Stripe customer is being created
            </span>
            <LinkStripeCustomer autoCreate organizationId={organizationId} />
          </div>
        )}

        {/* Billing Summary */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Next Payment */}
          {hasActiveSubscription && subscription.periodEnd ? (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Calendar className="text-muted-foreground size-4" />
              <div>
                <div className="text-muted-foreground text-xs">
                  {subscription.cancelAtPeriodEnd
                    ? "Access until"
                    : "Next payment"}
                </div>
                <div className="text-sm font-medium">
                  {dayjs(subscription.periodEnd).format("MMM DD, YYYY")}
                  {!subscription.cancelAtPeriodEnd && nextPaymentAmount > 0 && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      (~${nextPaymentAmount})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Calendar className="text-muted-foreground size-4" />
              <div>
                <div className="text-muted-foreground text-xs">
                  Next payment
                </div>
                <div className="text-muted-foreground text-sm">—</div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <CreditCard className="text-muted-foreground size-4" />
            <div>
              <div className="text-muted-foreground text-xs">
                Payment method
              </div>
              {paymentMethod ? (
                <div className="text-sm font-medium">
                  {CARD_BRANDS[paymentMethod.brand] ?? paymentMethod.brand} ••••{" "}
                  {paymentMethod.last4}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No card on file
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment History Table */}
        {loading ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            Loading payments...
          </div>
        ) : payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">
                    {dayjs(payment.created * 1000).format("MMM DD, YYYY")}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {payment.description}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {payment.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="text-muted-foreground size-3" />
                      <span className="text-sm font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(payment.status)}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.invoice?.invoice_pdf ? (
                      <a
                        href={payment.invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No payment history
          </div>
        )}
      </CardContent>
    </Card>
  );
}
