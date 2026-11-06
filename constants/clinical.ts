/**
 * Clinical option lists.
 *
 * These stay in Latin in both languages and are not routed through i18n — see
 * constants/i18n/README.md. A Devanagari transliteration of a cancer type is not
 * a form an oncologist or a TPA desk reads, and the value is what Ops files the
 * ticket under.
 *
 * The list is the common solid and haematological cancers Oncare treats, plus an
 * "Other" escape so a patient whose diagnosis is not listed can still submit —
 * the same never-block principle applied to the catalogue.
 *
 * TODO(medical): have the oncology team confirm this list before release. It was
 * assembled from the service pages on oncarecancer.com, not supplied by them,
 * and section 19 does not list it as an owned item.
 */
export const CANCER_TYPES = [
  'Breast cancer',
  'Lung cancer',
  'Oral / Head & neck cancer',
  'Cervical cancer',
  'Ovarian cancer',
  'Colorectal cancer',
  'Stomach cancer',
  'Liver cancer',
  'Pancreatic cancer',
  'Prostate cancer',
  'Kidney cancer',
  'Bladder cancer',
  'Thyroid cancer',
  'Oesophageal cancer',
  'Brain tumour',
  'Bone & soft tissue sarcoma',
  'Blood cancer – Leukaemia',
  'Blood cancer – Lymphoma',
  'Blood cancer – Myeloma',
  'Not diagnosed yet',
  'Other',
] as const;

/** Day-care vs admission vs radiation — the three options on H2. */
export const ADMISSION_KINDS = [
  { value: 'dayCareChemo', labelKey: 'ui.admission.dayCareChemo', hintKey: 'ui.admission.dayCareChemoHint' },
  { value: 'admission', labelKey: 'ui.admission.admissionSurgery', hintKey: 'ui.admission.admissionSurgeryHint' },
  { value: 'radiation', labelKey: 'ui.admission.radiation', hintKey: 'ui.admission.radiationHint' },
] as const;

/** Payment routes on H2. */
export const PAYMENT_MODES = [
  { value: 'insurance', labelKey: 'ui.admission.insuranceTpa' },
  { value: 'self', labelKey: 'ui.admission.selfPay' },
  { value: 'govt', labelKey: 'ui.admission.govtScheme' },
] as const;
