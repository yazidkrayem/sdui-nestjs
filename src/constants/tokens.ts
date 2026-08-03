/** DI token for the host-supplied (or default) admin-auth guard. Must attach `SduiActor` to the request. */
export const SDUI_AUTH_GUARD = Symbol('SDUI_AUTH_GUARD');

/** DI token for the cache backing manifest/nav/strings/preview-token storage. */
export const SDUI_CACHE_PROVIDER = Symbol('SDUI_CACHE_PROVIDER');

/** DI token for the audit sink written to on create/update/publish/delete actions. */
export const SDUI_AUDIT_PROVIDER = Symbol('SDUI_AUDIT_PROVIDER');

/** DI token for the push-notification sender. Only required if SduiPushModule is imported. */
export const SDUI_PUSH_PROVIDER = Symbol('SDUI_PUSH_PROVIDER');

/** DI token for looking up/invalidating device tokens. Only required if SduiPushModule is imported. */
export const SDUI_DEVICE_TOKEN_PROVIDER = Symbol('SDUI_DEVICE_TOKEN_PROVIDER');

/** DI token for the resolved SduiModuleOptions, re-exposed for adapters/guards that need config. */
export const SDUI_MODULE_OPTIONS = Symbol('SDUI_MODULE_OPTIONS');

/** DI token for the host's own domain, used to build universal deep-link URLs. */
export const SDUI_DEEPLINK_BASE_URL = Symbol('SDUI_DEEPLINK_BASE_URL');
