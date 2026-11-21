/**
 * Where an incoming attachment is filed (review fix C9). A Deal ID inside the
 * file decides on its own. Matching on the supplier domain alone files
 * automatically only when exactly one open agreement matches; with two, the
 * user chooses. Pure.
 */
export interface OpenAgreement {
  dealId: string;
  contractId: string;
  title: string;
  supplierDomain: string;
  dealIdTag?: string | null;
}

export type FileDecision =
  | { kind: 'auto'; agreement: OpenAgreement; reason: 'deal_id' | 'only_match' }
  | { kind: 'choose'; options: OpenAgreement[] }
  | { kind: 'none' };

export function fileDecision(fromAddress: string, agreements: OpenAgreement[], file?: { dealIdTag?: string | null }): FileDecision {
  if (file?.dealIdTag) {
    const tagged = agreements.find((a) => a.dealIdTag === file.dealIdTag);
    if (tagged) return { kind: 'auto', agreement: tagged, reason: 'deal_id' };
  }
  const domain = fromAddress.split('@')[1]?.toLowerCase();
  const matches = agreements.filter((a) => a.supplierDomain.toLowerCase() === domain);
  if (matches.length === 1) return { kind: 'auto', agreement: matches[0], reason: 'only_match' };
  if (matches.length > 1) return { kind: 'choose', options: matches };
  return { kind: 'none' };
}

/** The CloudDesk MSA, and a second open CloudDesk agreement used by the ambiguous-match variant. */
export const CLOUDDESK_AGREEMENTS: OpenAgreement[] = [
  { dealId: 'D-CLOUDDESK', contractId: 'C-2026-0417', title: 'CloudDesk MSA', supplierDomain: 'clouddesk.example', dealIdTag: 'DL-CLOUDDESK-2026' },
  { dealId: 'D-CLOUDDESK-SUPPORT', contractId: 'C-2026-0388', title: 'CloudDesk Support Renewal', supplierDomain: 'clouddesk.example', dealIdTag: null },
];
