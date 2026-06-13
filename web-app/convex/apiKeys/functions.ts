import { v, type ObjectType, type PropertyValidators } from "convex/values";
import {
  action,
  internalQuery,
  type ActionCtx,
  type QueryCtx,
} from "@convex/_generated/server";
import { verifyApiKeyForOrg } from "@convex/apiKeys/helpers";

export type ApiResult<TPayload> =
  | { ok: false; status: number; message: string }
  | ({ ok: true; status: 200 } & TPayload);

type MaybePromise<T> = T | Promise<T>;

type OrgApiArgs<TArgs extends PropertyValidators> = ObjectType<TArgs> & {
  organizationId: string;
};

type OrgApiActionConfig<TArgs extends PropertyValidators, TPayload> = {
  args: TArgs;
  handler: (
    ctx: ActionCtx,
    args: OrgApiArgs<TArgs>,
  ) => MaybePromise<ApiResult<TPayload>>;
};

type OrgApiQueryConfig<TArgs extends PropertyValidators, TResult> = {
  args: TArgs;
  handler: (ctx: QueryCtx, args: OrgApiArgs<TArgs>) => MaybePromise<TResult>;
};

export function orgApiAction<
  TArgs extends PropertyValidators,
  TPayload,
>(config: OrgApiActionConfig<TArgs, TPayload>) {
  return action({
    args: { apiKey: v.string(), ...config.args },
    handler: async (ctx, rawArgs): Promise<ApiResult<TPayload>> => {
      const args = rawArgs as ObjectType<TArgs> & { apiKey: string };
      const verification = await verifyApiKeyForOrg(ctx, args.apiKey);
      if (!verification.ok) return verification;

      const { apiKey, ...handlerArgs } = args;
      void apiKey;

      return config.handler(ctx, {
        ...handlerArgs,
        organizationId: verification.organizationId,
      } as unknown as OrgApiArgs<TArgs>);
    },
  });
}

export function orgApiQuery<TArgs extends PropertyValidators, TResult>(
  config: OrgApiQueryConfig<TArgs, TResult>,
) {
  return internalQuery({
    args: { organizationId: v.string(), ...config.args },
    handler: async (ctx, args): Promise<TResult> => {
      return config.handler(ctx, args as OrgApiArgs<TArgs>);
    },
  });
}
