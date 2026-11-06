import { fetchWrapper } from '@/utils/fetchWrapper';

/**
 * Patient documents for the Records screen (D2).
 *
 * The design asks for five type badges — LAB, Rx, SCAN, DS, ME — and category
 * chips for All / Lab / Scans / Rx. The data cannot support that, and this
 * module is where the gap is handled rather than hidden:
 *
 *   documents.type   has exactly two values: "Reports" (5,157) and
 *                    "Prescription" (11)
 *   documents.source "api" (from Docpulse) or "patient-management"
 *   no title field   at all
 *
 * Issue #9 in the PDF says to "use document type + title from HIS". Docpulse
 * does not send either. Every document it pushes carries only:
 *
 *   { description: "Reports", file_name: "WhatsApp Image 2025-12-15 at 4.51.32 PM.jpeg",
 *     file_size, createdBy: "Docpulse", file_id: "48026/files/<uuid>" }
 *
 * `description` just repeats the type and `file_name` is whatever the sender's
 * phone called it. So a readable title is derived here from what is actually
 * known — type, date and centre — and the raw file name is kept as a subtitle
 * rather than being shown as the title, which was the original complaint.
 *
 * The one genuinely useful signal: `file_id` is prefixed with the Docpulse
 * locationId, so a document can be attributed to the centre that uploaded it.
 * That is where the design's "Oncare Gurugram" source line comes from.
 */

export type RecordCategory = 'lab' | 'scan' | 'rx' | 'discharge' | 'other';

export type PatientRecord = {
  id: string;
  /** Derived, readable. Never the raw file name. */
  title: string;
  /** The original file name, shown small beneath the title. */
  fileName?: string;
  category: RecordCategory;
  /** Badge text: LAB, Rx, SCAN, DS, ME. */
  badge: string;
  createdAt: string;
  /** "Oncare Gurugram" or "Uploaded by you". */
  source: string;
  url?: string;
  /** Storage key for private documents, exchanged for a presigned URL. */
  fileKey?: string;
  /** Unseen by the patient — drives the "New" tag. */
  isNew?: boolean;
  mimeType?: string;
};

/** Docpulse locationId -> patient-facing centre name. */
const CENTRE_BY_LOCATION: Record<string, string> = {
  '45390': 'Oncare Greater Kailash',
  '47010': 'Oncare West Delhi',
  '46940': 'Oncare Ghaziabad',
  '48026': 'Oncare Gurugram',
  '49495': 'Oncare Bengaluru',
  '49502': 'Oncare Noida',
  '50101': 'Oncare Bengaluru',
  '50299': 'Oncare Kalyan Nagar',
};

const BADGE: Record<RecordCategory, string> = {
  lab: 'LAB',
  scan: 'SCAN',
  rx: 'Rx',
  discharge: 'DS',
  other: 'ME',
};

/**
 * Best-effort category.
 *
 * `type` only distinguishes prescriptions, so the file name is sniffed for the
 * obvious cases. This is a heuristic and is wrong sometimes — which is why the
 * Records screen only shows chips for categories that actually appear, instead
 * of four chips where two are always empty.
 */
function categorise(type: string, fileName: string): RecordCategory {
  const t = type.toLowerCase();
  if (t.includes('prescription')) return 'rx';

  const n = fileName.toLowerCase();
  if (/\b(ct|mri|pet|x-?ray|usg|ultrasound|scan|mammo)\b/.test(n)) return 'scan';
  if (/\b(cbc|lft|kft|rft|hba1c|biopsy|histo|cytology|panel|profile|marker)\b/.test(n))
    return 'lab';
  if (/\b(discharge|summary|ds)\b/.test(n)) return 'discharge';

  // "Reports" with nothing else to go on. Not guessed as lab — a wrong badge is
  // worse than a neutral one on a medical record.
  return 'other';
}

function centreFor(fileId: string | undefined): string | null {
  if (!fileId) return null;
  const locationId = fileId.split('/')[0];
  return CENTRE_BY_LOCATION[locationId] ?? null;
}

function titleFor(
  category: RecordCategory,
  createdAt: string,
  centre: string | null
): string {
  const when = new Date(createdAt);
  const date = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const kind =
    category === 'rx'
      ? 'Prescription'
      : category === 'scan'
      ? 'Scan report'
      : category === 'lab'
      ? 'Lab report'
      : category === 'discharge'
      ? 'Discharge summary'
      : 'Report';

  return [kind, date].filter(Boolean).join(' · ') + (centre ? '' : '');
}

export async function listRecords(): Promise<PatientRecord[]> {
  const res = await fetchWrapper<any>('/getPatientDocuments');
  const raw: any[] = res?.data ?? [];

  return raw
    .filter((d) => d.isActive !== false)
    .map((d) => {
      const extra = d.extraData ?? {};
      const fileName: string = extra.file_name ?? '';
      const category = categorise(String(d.type ?? ''), fileName);
      const centre = centreFor(extra.file_id);
      const createdAt = d.createdAt ?? d.created_at ?? new Date().toISOString();
      const uploadedByPatient = d.source === 'patient-management';

      return {
        id: String(d._id ?? d.id),
        title: titleFor(category, createdAt, centre),
        fileName: fileName || undefined,
        category,
        badge: BADGE[category],
        createdAt,
        source: uploadedByPatient ? 'uploadedByYou' : centre ?? 'Oncare',
        url: d.url ?? d.file_url,
        fileKey: d.fileKey,
        isNew: d.seenAt === undefined || d.seenAt === null,
        mimeType: d.mimeType,
      } satisfies PatientRecord;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Groups into "November 2026" buckets, newest first, as the design shows. */
export function groupByMonth(
  records: PatientRecord[]
): { label: string; items: PatientRecord[] }[] {
  const buckets = new Map<string, PatientRecord[]>();

  for (const r of records) {
    const d = new Date(r.createdAt);
    const label = Number.isNaN(d.getTime())
      ? 'Earlier'
      : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const list = buckets.get(label);
    if (list) list.push(r);
    else buckets.set(label, [r]);
  }

  return Array.from(buckets, ([label, items]) => ({ label, items }));
}
