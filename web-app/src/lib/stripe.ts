import Stripe from "stripe";
import { env } from "./env";

let _stripe: Stripe | null = null;

export const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured in this runtime.");
  }

  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
};

// Keep backwards compat for imports that use `stripe` directly
// This will throw on client - server-only
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
