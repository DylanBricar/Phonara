import { Resend } from "resend";
import { env } from "../env";
import type { MailAdapter } from "./send-email";

let _resend: Resend | null = null;

export const getResend = () => {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured in this runtime.");
  }

  if (!_resend) {
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
};

export const resendMailAdapter: MailAdapter = {
  send: async (params) => {
    const result = await getResend().emails.send(params);

    if (result.error) {
      return { error: new Error(result.error.message), data: null };
    }

    return { error: null, data: { id: result.data.id } };
  },
};
