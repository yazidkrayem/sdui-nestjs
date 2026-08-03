/** Sends push notifications to raw device tokens. Only wired up if SduiPushModule is imported. */
export interface SduiPushPort {
  sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<{ invalidTokens: string[] }>;
}

/**
 * Looks up and invalidates device tokens. SDUI has no opinion on how the host
 * models "devices"/"users" — this port is the only seam it needs.
 */
export interface SduiDeviceTokenPort {
  /** Returns tokens for the given user ids, or all registered tokens if omitted. */
  listTokens(targetUserIds?: string[]): Promise<string[]>;
  /** Called with tokens the push provider reported as invalid/unregistered. */
  invalidateTokens(tokens: string[]): Promise<void>;
}
