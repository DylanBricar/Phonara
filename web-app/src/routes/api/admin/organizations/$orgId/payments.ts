import { fetchAuthQuery } from "@/lib/auth-server";
import { getRequiredAdmin } from "@/lib/auth/auth-user";
import { stripe } from "@/lib/stripe";
import { handleApiError } from "@/lib/api-middleware";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";

export const Route = createFileRoute("/api/admin/organizations/$orgId/payments")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await getRequiredAdmin();

          const org = await fetchAuthQuery(api.admin.queries.getOrganizationById, {
            organizationId: params.orgId,
          });

          const stripeCustomerId = org?.stripeCustomerId ?? "";
          if (!stripeCustomerId) {
            return Response.json({ payments: [] });
          }

          const invoices = await stripe.invoices.list({
            customer: stripeCustomerId,
            limit: 50,
          });

          const payments = invoices.data.map((invoice) => ({
            id: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status ?? "unknown",
            created: invoice.created,
            description: `Invoice for ${invoice.description ?? "subscription"}`,
            invoice: {
              invoice_pdf: invoice.invoice_pdf,
            },
          }));

          return Response.json({ payments });
        } catch (e) {
          return handleApiError(e);
        }
      },
    },
  },
});
