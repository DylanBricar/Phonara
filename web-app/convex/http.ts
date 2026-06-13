import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth/config";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    const result = await ctx.runAction(internal.stripe.actions.processWebhook, {
      body,
      signature,
    });
    if (!result.ok) {
      return new Response(JSON.stringify(result), { status: 400 });
    }
    return new Response(JSON.stringify(result), { status: 200 });
  }),
});

// --- Public API v1 ---

type ApiResult =
  | { ok: false; status: number; message: string }
  | ({ ok: true; status: 200 } & Record<string, unknown>);

const getApiKey = (request: Request): string | null => {
  const direct = request.headers.get("x-api-key");
  if (direct) return direct.trim() || null;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim() || null;
  return null;
};

const apiResponse = (result: ApiResult): Response => {
  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status });
  }
  const { ok: _ok, status: _status, ...payload } = result;
  return Response.json(payload);
};

http.route({
  path: "/api/v1/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = getApiKey(request);
    if (!apiKey) return Response.json({ message: "Missing API key" }, { status: 401 });
    const result = (await ctx.runAction(api.apiKeys.actions.getOrganization, { apiKey })) as ApiResult;
    return apiResponse(result);
  }),
});

http.route({
  path: "/api/v1/members",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = getApiKey(request);
    if (!apiKey) return Response.json({ message: "Missing API key" }, { status: 401 });
    const result = (await ctx.runAction(api.apiKeys.actions.listOrganizationMembers, { apiKey })) as ApiResult;
    return apiResponse(result);
  }),
});

http.route({
  pathPrefix: "/api/v1/members/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = getApiKey(request);
    if (!apiKey) return Response.json({ message: "Missing API key" }, { status: 401 });
    const url = new URL(request.url);
    const memberId = url.pathname.slice("/api/v1/members/".length);
    if (!memberId) return Response.json({ message: "Missing memberId" }, { status: 400 });
    const result = (await ctx.runAction(api.apiKeys.actions.getOrganizationMember, { apiKey, memberId })) as ApiResult;
    return apiResponse(result);
  }),
});

export default http;
