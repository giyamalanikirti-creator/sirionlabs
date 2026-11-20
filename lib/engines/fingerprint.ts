/**
 * How Word recognises a contract file when the Sirion tag is missing (the
 * supplier re-saved or retyped it): compare clause text with the versions
 * Sirion already holds. Pure.
 */
import type { DocVersion } from '@/lib/types';

export interface FingerprintMatch {
  versionId: string;
  same: number;
  total: number;
}

/**
 * The version Sirion already held with the most clauses identical to this file
 * (ties go to the most recent). Only versions sent before the file count.
 */
export function closestVersion(file: DocVersion, known: DocVersion[]): FingerprintMatch | null {
  let best: FingerprintMatch & { at: string } | null = null;
  for (const v of known) {
    if (v.id === file.id || v.sentAt >= file.sentAt) continue;
    const texts = new Set(v.clauses.map((c) => c.text));
    const same = file.clauses.filter((c) => texts.has(c.text)).length;
    if (!best || same > best.same || (same === best.same && v.sentAt > best.at)) {
      best = { versionId: v.id, same, total: file.clauses.length, at: v.sentAt };
    }
  }
  return best && best.same > 0 ? { versionId: best.versionId, same: best.same, total: best.total } : null;
}
