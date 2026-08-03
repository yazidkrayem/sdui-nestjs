/** Audit sink for admin actions (screen create/update/publish/delete, nav/strings edits, etc). */
export interface SduiAuditPort {
  /** Fire-and-forget by convention — must not throw back into the calling request. */
  record(
    actorId: string,
    action: string,
    targetId?: string,
    targetType?: string,
    meta?: Record<string, unknown>,
  ): void;
}
