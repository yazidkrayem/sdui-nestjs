/**
 * Identity attached to the request by the host's auth guard (see SDUI_AUTH_GUARD).
 * SDUI stores `actorId` as a plain uuid/string column with no FK to any host entity —
 * it never needs to know what an "admin" or "user" looks like in the host app.
 */
export interface SduiActor {
  actorId: string;
  /** Permission strings checked by RequirePermission()/SduiPermissionGuard. */
  permissions?: string[];
  /** Equivalent of a super-admin — skips permission checks entirely when true. */
  bypassPermissionChecks?: boolean;
}

declare module 'express' {
  interface Request {
    sduiActor?: SduiActor;
  }
}
