export interface AbrResponse {
  Abn: string;
  AbnStatus: "Active" | "Cancelled" | string;
  AbnStatusEffectiveFrom: string;
  Acn: string;
  AddressDate: string;
  AddressPostcode: string;
  AddressState: string;
  BusinessName: string[];
  EntityName: string;
  EntityTypeCode: string;
  EntityTypeName: string;
  Gst: string | null; // GST registration date string, or null if not registered
  Message: string; // Empty on success, error description on failure
}

export interface AbrCacheRow {
  abn: string;
  entity_name: string | null;
  entity_type: string | null;
  gst_registered: boolean | null;
  gst_from_date: string | null;
  abn_status: string | null;
  abn_status_from: string | null;
  main_name: string | null;
  state_code: string | null;
  postcode: string | null;
  raw_response: AbrResponse;
  fetched_at: string;
  expires_at: string;
}
