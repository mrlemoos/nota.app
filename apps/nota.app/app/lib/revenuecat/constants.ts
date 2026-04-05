/**
 * RevenueCat dashboard entitlement **Identifier** (Web SDK `CustomerInfo.entitlements.active` keys).
 * Web offering: `nota_offering` with packages `$rc_monthly` / `$rc_annual`; products `nota_pro_monthly` / `nota_pro_yearly`.
 */
export const ENTITLEMENT_NOTA_PRO = 'nota_pro';

/**
 * RevenueCat dashboard **REST API Identifier** for the same entitlement.
 * Used when parsing `GET /v1/subscribers/{app_user_id}` if the payload keys entitlements by this id.
 */
export const ENTITLEMENT_NOTA_PRO_REST_ID = 'entld5de245523';

/** sessionStorage: last known server entitlement for offline client loader behaviour (`1` = entitled). */
export const NOTA_SERVER_NOTES_ENTITLED_SESSION_KEY =
  'nota-notes-server-entitled';
