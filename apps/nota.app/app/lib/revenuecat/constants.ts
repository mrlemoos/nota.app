/**
 * RevenueCat dashboard entitlement **Identifier** (Web SDK `CustomerInfo.entitlements.active` keys).
 */
export const ENTITLEMENT_NOTA_PRO = 'Nota Pro';

/**
 * RevenueCat dashboard **REST API Identifier** for the same entitlement.
 * Used when parsing `GET /v1/subscribers/{app_user_id}` if the payload keys entitlements by this id.
 */
export const ENTITLEMENT_NOTA_PRO_REST_ID = 'entl81a5d697e6';

/** sessionStorage: last known server entitlement for offline client loader behaviour (`1` = entitled). */
export const NOTA_SERVER_NOTES_ENTITLED_SESSION_KEY =
  'nota-notes-server-entitled';
