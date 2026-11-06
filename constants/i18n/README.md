# Strings and translation

## Why three namespaces and not one

Hindi copy in this app is not uniformly safe to machine-translate. The strings
split into three groups with different review requirements, so they live in
three namespaces and the distinction is enforced by `t()`'s types.

### `ui.*` — translated

Chrome: buttons, labels, navigation, section headings, empty states, generic
helper text. "Continue", "Book", "No reports yet", "Search doctor".

A wrong word here is a cosmetic bug. These are translated and ready to ship.

### `clinical.*` — English-locked, never translated

Drug names, strengths, dosage notation, test names, cancer types.

`Capecitabine 500 mg`, `1-0-1 x 14 days`, `CA 15-3`, `KFT`.

These stay in Latin script in both languages, deliberately:

- Pharmacists, nurses and doctors read drug names in Latin. A Devanagari
  transliteration of `Capecitabine` is not a recognised form and would have to be
  converted back before anyone could dispense against it.
- Transliteration is lossy in exactly the wrong way. `Capecitabine` and
  `Capecitabine` differ from `Carboplatin` by more than their Devanagari
  renderings would suggest once vowel marks are approximated.
- Dosage notation is numeric and positional. Translating "1-0-1" into words
  invites a dosing error, which is the one class of bug this app must not ship.

The surrounding sentence is still Hindi — only the medical token stays English.
Render these with `<Txt script="latin">` so they keep Montserrat even in Hindi,
rather than falling back to the Devanagari face mid-sentence.

### `legal.*` — needs human sign-off before it ships in Hindi

Consent text, the approximate-price disclaimer, SOS and emergency copy, anything
covered by the NMC advertising guidelines.

Currently these fall back to English in Hindi mode. That is intentional: shipping
a machine-translated consent checkbox would mean asking a cancer patient to agree
to something nobody has read in the language they are reading it in.

Section 19 of the redesign PDF routes NMC/advertising copy through
Marketing/Legal. The Hindi versions of these keys belong in that same review.
When they come back signed off, move them from `legal.en`-only into `legal.hi`
and delete the fallback.

## Adding a string

1. Add the key to `en.ts` first. The English file is the source of truth and its
   type drives every other locale.
2. Add the Hindi to `hi.ts`. TypeScript will tell you if you miss a key in
   `ui.*`; `legal.*` keys are optional there by design.
3. Never concatenate translated fragments. Use a parameter:
   `t('ui.cart.itemCount', { count: 3 })`, not `t('ui.cart.items') + count`.
   Hindi word order and postpositions do not survive concatenation.

## What is deliberately not here

No `ne`/`ta`/`kn` yet. The 9 centres split 5 Delhi NCR / 4 Bengaluru, so Kannada
is arguably more useful than Hindi for a bit under half of them — but that is an
Ops decision, not one to pre-empt in code. The loader takes any locale, so adding
one is a new file plus a line in `index.ts`.
