export interface QRScanResult {
  user_id: string;
  full_name: string;
  email: string | null;
  loyalty_points: number;
}

export type ScannerMode = "identification" | "redemption";

export interface AwardPointsInput {
  userId: string;
  siteId: string;
  amountCop: number;
  externalRef: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AwardPointsResult {
  success: boolean;
  duplicate?: boolean;
  error?: string;
  points_awarded?: number;
  new_balance?: number;
  transaction_id?: string;
  external_sale_id?: string;
}
