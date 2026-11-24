export const UNIVERSITIES = Object.freeze({
  vit: Object.freeze({
    id: 'vit',
    name: 'VIT University',
    shortName: 'VIT',
    grades: Object.freeze([
      Object.freeze({ label: 'S', points: 10 }),
      Object.freeze({ label: 'A', points: 9 }),
      Object.freeze({ label: 'B', points: 8 }),
      Object.freeze({ label: 'C', points: 7 }),
      Object.freeze({ label: 'D', points: 6 }),
      Object.freeze({ label: 'E', points: 5 }),
      Object.freeze({ label: 'F', points: 0 }),
      Object.freeze({ label: 'N', points: 0 }),
    ]),
    credits: Object.freeze([1, 1.5, 2, 3, 4, 5, 20]),
    hasExpectedMarks: true,
  }),
  anna: Object.freeze({
    id: 'anna',
    name: 'Anna University',
    shortName: 'Anna Univ',
    grades: Object.freeze([
      Object.freeze({ label: 'O', points: 10 }),
      Object.freeze({ label: 'A+', points: 9 }),
      Object.freeze({ label: 'A', points: 8 }),
      Object.freeze({ label: 'B+', points: 7 }),
      Object.freeze({ label: 'B', points: 6 }),
      Object.freeze({ label: 'C', points: 5 }),
      Object.freeze({ label: 'U / RA', points: 0 }),
    ]),
    credits: Object.freeze([1, 2, 3, 4, 5, 6, 10, 20]),
    hasExpectedMarks: false,
  }),
  ktu: Object.freeze({
    id: 'ktu',
    name: 'KTU',
    shortName: 'KTU',
    grades: Object.freeze([
      Object.freeze({ label: 'S / O', points: 10 }),
      Object.freeze({ label: 'A+', points: 9 }),
      Object.freeze({ label: 'A', points: 8.5 }),
      Object.freeze({ label: 'B+', points: 8 }),
      Object.freeze({ label: 'B', points: 7.5 }),
      Object.freeze({ label: 'C+', points: 7 }),
      Object.freeze({ label: 'C', points: 6.5 }),
      Object.freeze({ label: 'D', points: 6 }),
      Object.freeze({ label: 'P', points: 5.5 }),
      Object.freeze({ label: 'F / FE / I', points: 0 }),
    ]),
    credits: Object.freeze([1, 2, 3, 4, 5, 6]),
    hasExpectedMarks: false,
  }),
  srm: Object.freeze({
    id: 'srm',
    name: 'SRMIST',
    shortName: 'SRM',
    grades: Object.freeze([
      Object.freeze({ label: 'O', points: 10 }),
      Object.freeze({ label: 'A+', points: 9 }),
      Object.freeze({ label: 'A', points: 8 }),
      Object.freeze({ label: 'B+', points: 7 }),
      Object.freeze({ label: 'B', points: 6 }),
      Object.freeze({ label: 'C', points: 5 }),
      Object.freeze({ label: 'F / Ab / I', points: 0 }),
    ]),
    credits: Object.freeze([1, 2, 3, 4, 5, 6, 7]),
    hasExpectedMarks: false,
  }),
});

/**
 * Resolve a university configuration by key, falling back to VIT.
 * @param {string | null | undefined} key
 */
export function getUniversityConfig(key) {
  const normalized = typeof key === 'string' ? key.trim().toLowerCase() : '';
  return Object.hasOwn(UNIVERSITIES, normalized) ? UNIVERSITIES[normalized] : UNIVERSITIES.vit;
}
