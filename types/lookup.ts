export type LookupResultState =
  | {
      state: "peppol_registered";
      abn: string;
      entity_name: string;
      entity_type: string | null;
      gst_registered: boolean;
      state_code: string | null;
    }
  | {
      state: "peppol_not_confirmed";
      abn: string;
      entity_name: string;
      entity_type: string | null;
      state_code: string | null;
    }
  | {
      state: "abn_cancelled";
      abn: string;
      entity_name: string;
    }
  | {
      state: "abr_error";
      abn: string;
    }
  | {
      state: "invalid_abn";
      error: string;
    };
