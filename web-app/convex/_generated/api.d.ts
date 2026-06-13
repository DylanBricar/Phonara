/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_billing from "../admin/billing.js";
import type * as admin_dto_account from "../admin/dto/account.js";
import type * as admin_dto_membership from "../admin/dto/membership.js";
import type * as admin_dto_organization from "../admin/dto/organization.js";
import type * as admin_dto_session from "../admin/dto/session.js";
import type * as admin_dto_user from "../admin/dto/user.js";
import type * as admin_feedbacks from "../admin/feedbacks.js";
import type * as admin_helpers from "../admin/helpers.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as admin_subscriptions from "../admin/subscriptions.js";
import type * as apiKeys_actions from "../apiKeys/actions.js";
import type * as apiKeys_dto_apiKey from "../apiKeys/dto/apiKey.js";
import type * as apiKeys_functions from "../apiKeys/functions.js";
import type * as apiKeys_helpers from "../apiKeys/helpers.js";
import type * as apiKeys_mutations from "../apiKeys/mutations.js";
import type * as apiKeys_queries from "../apiKeys/queries.js";
import type * as auth_config from "../auth/config.js";
import type * as auth_emailTemplates from "../auth/emailTemplates.js";
import type * as auth_functions from "../auth/functions.js";
import type * as auth_helpers from "../auth/helpers.js";
import type * as auth_mutations from "../auth/mutations.js";
import type * as auth_orgAccess from "../auth/orgAccess.js";
import type * as auth_permissions from "../auth/permissions.js";
import type * as auth_queries from "../auth/queries.js";
import type * as billing_plans from "../billing/plans.js";
import type * as contact_mutations from "../contact/mutations.js";
import type * as email_actions from "../email/actions.js";
import type * as email_markdownEmail from "../email/markdownEmail.js";
import type * as email_mutations from "../email/mutations.js";
import type * as feedbacks_mutations from "../feedbacks/mutations.js";
import type * as files_actions from "../files/actions.js";
import type * as http from "../http.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as stripe_actions from "../stripe/actions.js";
import type * as subscriptions_mutations from "../subscriptions/mutations.js";
import type * as subscriptions_queries from "../subscriptions/queries.js";
import type * as utils_errors from "../utils/errors.js";
import type * as utils_siteConfig from "../utils/siteConfig.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/billing": typeof admin_billing;
  "admin/dto/account": typeof admin_dto_account;
  "admin/dto/membership": typeof admin_dto_membership;
  "admin/dto/organization": typeof admin_dto_organization;
  "admin/dto/session": typeof admin_dto_session;
  "admin/dto/user": typeof admin_dto_user;
  "admin/feedbacks": typeof admin_feedbacks;
  "admin/helpers": typeof admin_helpers;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "admin/subscriptions": typeof admin_subscriptions;
  "apiKeys/actions": typeof apiKeys_actions;
  "apiKeys/dto/apiKey": typeof apiKeys_dto_apiKey;
  "apiKeys/functions": typeof apiKeys_functions;
  "apiKeys/helpers": typeof apiKeys_helpers;
  "apiKeys/mutations": typeof apiKeys_mutations;
  "apiKeys/queries": typeof apiKeys_queries;
  "auth/config": typeof auth_config;
  "auth/emailTemplates": typeof auth_emailTemplates;
  "auth/functions": typeof auth_functions;
  "auth/helpers": typeof auth_helpers;
  "auth/mutations": typeof auth_mutations;
  "auth/orgAccess": typeof auth_orgAccess;
  "auth/permissions": typeof auth_permissions;
  "auth/queries": typeof auth_queries;
  "billing/plans": typeof billing_plans;
  "contact/mutations": typeof contact_mutations;
  "email/actions": typeof email_actions;
  "email/markdownEmail": typeof email_markdownEmail;
  "email/mutations": typeof email_mutations;
  "feedbacks/mutations": typeof feedbacks_mutations;
  "files/actions": typeof files_actions;
  http: typeof http;
  "organizations/queries": typeof organizations_queries;
  "stripe/actions": typeof stripe_actions;
  "subscriptions/mutations": typeof subscriptions_mutations;
  "subscriptions/queries": typeof subscriptions_queries;
  "utils/errors": typeof utils_errors;
  "utils/siteConfig": typeof utils_siteConfig;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
