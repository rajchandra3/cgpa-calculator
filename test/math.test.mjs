import test from 'node:test';
import assert from 'node:assert/strict';

import { UNIVERSITIES, getUniversityConfig } from '../src/js/universities.js';
import {
  roundToTwo,
  formatScore,
  parseOptionalNumber,
  calculateGpa,
  calculateQuickCgpa,
  calculateExpectedMarks,
  calculateAllSemCgpa,
} from '../src/js/math.js';

test('UNIVERSITIES config matches exact grade scales and credits', () => {
  assert.deepEqual(Object.keys(UNIVERSITIES), ['vit', 'anna', 'ktu', 'srm']);

  assert.equal(UNIVERSITIES.vit.hasExpectedMarks, true);
  assert.equal(UNIVERSITIES.vit.grades.length, 8);
  assert.deepEqual(UNIVERSITIES.vit.credits, [1, 1.5, 2, 3, 4, 5, 20]);
  assert.deepEqual(UNIVERSITIES.vit.grades[0], { label: 'S', points: 10 });
  assert.deepEqual(UNIVERSITIES.vit.grades[7], { label: 'N', points: 0 });

  assert.equal(UNIVERSITIES.anna.hasExpectedMarks, false);
  assert.deepEqual(UNIVERSITIES.anna.credits, [1, 2, 3, 4, 5, 6, 10, 20]);
  assert.deepEqual(UNIVERSITIES.anna.grades[6], { label: 'U / RA', points: 0 });

  assert.equal(UNIVERSITIES.ktu.hasExpectedMarks, false);
  assert.deepEqual(UNIVERSITIES.ktu.credits, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(UNIVERSITIES.ktu.grades[2], { label: 'A', points: 8.5 });
  assert.deepEqual(UNIVERSITIES.ktu.grades[8], { label: 'P', points: 5.5 });
  assert.deepEqual(UNIVERSITIES.ktu.grades[9], { label: 'F / FE / I', points: 0 });

  assert.equal(UNIVERSITIES.srm.hasExpectedMarks, false);
  assert.deepEqual(UNIVERSITIES.srm.credits, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(UNIVERSITIES.srm.grades[6], { label: 'F / Ab / I', points: 0 });
});

test('getUniversityConfig resolves case-insensitively and falls back to vit', () => {
  assert.equal(getUniversityConfig('vit'), UNIVERSITIES.vit);
  assert.equal(getUniversityConfig('ANNA'), UNIVERSITIES.anna);
  assert.equal(getUniversityConfig(' ktu '), UNIVERSITIES.ktu);
  assert.equal(getUniversityConfig('srm'), UNIVERSITIES.srm);

  assert.equal(getUniversityConfig('unknown'), UNIVERSITIES.vit);
  assert.equal(getUniversityConfig('toString'), UNIVERSITIES.vit);
  assert.equal(getUniversityConfig(''), UNIVERSITIES.vit);
  assert.equal(getUniversityConfig(null), UNIVERSITIES.vit);
  assert.equal(getUniversityConfig(undefined), UNIVERSITIES.vit);
  assert.equal(getUniversityConfig(42), UNIVERSITIES.vit);
});

test('roundToTwo and formatScore handle rounding, -0, and non-finite inputs', () => {
  assert.equal(roundToTwo(9.571428), 9.57);
  assert.equal(roundToTwo(1.005), 1.01);
  assert.equal(Object.is(roundToTwo(-0.001), 0), true);
  assert.equal(roundToTwo(0), 0);
  assert.equal(roundToTwo(NaN), 0);
  assert.equal(roundToTwo(Infinity), 0);
  assert.equal(roundToTwo(-Infinity), 0);
  assert.equal(roundToTwo('5'), 0);

  assert.equal(formatScore(9), '9.00');
  assert.equal(formatScore(9.571428), '9.57');
  assert.equal(formatScore(NaN), '0.00');
});

test('parseOptionalNumber distinguishes blank from zero and invalid inputs', () => {
  assert.equal(parseOptionalNumber(''), null);
  assert.equal(parseOptionalNumber('   '), null);
  assert.equal(parseOptionalNumber(null), null);
  assert.equal(parseOptionalNumber(undefined), null);

  assert.equal(parseOptionalNumber(0), 0);
  assert.equal(parseOptionalNumber('0'), 0);
  assert.equal(parseOptionalNumber(' 8.75 '), 8.75);
  assert.equal(parseOptionalNumber(10), 10);

  assert.equal(Number.isNaN(parseOptionalNumber('abc')), true);
  assert.equal(Number.isNaN(parseOptionalNumber('12px')), true);
  assert.equal(Number.isNaN(parseOptionalNumber('Infinity')), true);
  assert.equal(Number.isNaN(parseOptionalNumber(Infinity)), true);
  assert.equal(Number.isNaN(parseOptionalNumber(NaN)), true);
  assert.equal(Number.isNaN(parseOptionalNumber(true)), true);
  assert.equal(Number.isNaN(parseOptionalNumber({})), true);
});

test('calculateGpa computes weighted GPA across VIT, KTU, Anna, SRM and validates rows', () => {
  // VIT S*4 + A*3 = 67/7 = 9.5714 -> 9.57
  const vitRes = calculateGpa([
    { grade: '10', credits: '4' },
    { grade: '9', credits: '3' },
    { grade: '', credits: '' },
  ]);
  assert.deepEqual(vitRes, {
    ok: true,
    gpa: 9.57,
    formatted: '9.57',
    totalCredits: 7,
    courseCount: 2,
    percentage: '95.71',
  });

  // 1.5 credit lab + F/N grade (0 points must NOT be treated as unselected)
  const zeroGradeRes = calculateGpa([
    { grade: '10', credits: '1.5' },
    { grade: '0', credits: '3' },
  ]);
  assert.deepEqual(zeroGradeRes, {
    ok: true,
    gpa: 3.33,
    formatted: '3.33',
    totalCredits: 4.5,
    courseCount: 2,
    percentage: '33.33',
  });

  // Pure F grade semester (0.00 GPA)
  const allFailRes = calculateGpa([{ grade: 0, credits: 4 }]);
  assert.equal(allFailRes.ok, true);
  assert.equal(allFailRes.formatted, '0.00');

  // KTU P=5.5, A=8.5
  const ktuRes = calculateGpa([
    { grade: '5.5', credits: '4' },
    { grade: '8.5', credits: '4' },
  ]);
  assert.equal(ktuRes.ok, true);
  assert.equal(ktuRes.formatted, '7.00');

  // Partial rows
  const partialRes = calculateGpa([
    { grade: '10', credits: '' },
    { grade: '', credits: '3' },
    { grade: '9', credits: '4' },
  ]);
  assert.deepEqual(partialRes, {
    ok: false,
    error: 'Select both grade and credits for every entered course.',
    invalidRows: [0, 1],
  });

  // Invalid numeric ranges in rows
  const badRowRes = calculateGpa([
    null,
    { grade: '11', credits: '3' },
    { grade: '8', credits: '-1' },
    { grade: '8', credits: 'bad' },
    { grade: 'bad', credits: '3' },
  ]);
  assert.equal(badRowRes.ok, false);
  assert.deepEqual(badRowRes.invalidRows, [1, 2, 3, 4]);

  // Empty / non-array / zero credits
  assert.deepEqual(calculateGpa([]), {
    ok: false,
    error: 'Enter at least one course with grade and credits.',
  });
  assert.deepEqual(calculateGpa(null), {
    ok: false,
    error: 'Enter at least one course with grade and credits.',
  });
  assert.deepEqual(calculateGpa([{}, { grade: '', credits: '' }]), {
    ok: false,
    error: 'Enter at least one course with grade and credits.',
  });
  assert.deepEqual(calculateGpa([{ grade: '10', credits: '0' }]), {
    ok: false,
    error: 'Enter at least one course with grade and credits.',
  });
});

test('calculateQuickCgpa validates bounds, zero sum, and computes weighted CGPA', () => {
  const res = calculateQuickCgpa({
    prevCredits: '84',
    prevCgpa: '8.75',
    semCredits: '22',
    semGpa: '9.10',
  });
  assert.deepEqual(res, {
    ok: true,
    cgpa: 8.82,
    formatted: '8.82',
    totalCredits: 106,
    percentage: '88.23',
  });

  // First semester student (prevCredits = 0)
  const freshRes = calculateQuickCgpa({
    prevCredits: 0,
    prevCgpa: 0,
    semCredits: 20,
    semGpa: 9.5,
  });
  assert.equal(freshRes.ok, true);
  assert.equal(freshRes.formatted, '9.50');

  // Max bounds (prevCredits = 250, semCredits = 0)
  const maxRes = calculateQuickCgpa({
    prevCredits: 250,
    prevCgpa: 10,
    semCredits: 0,
    semGpa: 0,
  });
  assert.equal(maxRes.ok, true);
  assert.equal(maxRes.formatted, '10.00');

  // Zero total credits fails
  const zeroSum = calculateQuickCgpa({
    prevCredits: 0,
    prevCgpa: 0,
    semCredits: 0,
    semGpa: 0,
  });
  assert.equal(zeroSum.ok, false);
  assert.deepEqual(zeroSum.invalidFields, ['prevCredits', 'semCredits']);

  // Invalid/out-of-range fields
  const outOfRange = calculateQuickCgpa({
    prevCredits: 251,
    prevCgpa: 10.5,
    semCredits: 40,
    semGpa: -1,
  });
  assert.equal(outOfRange.ok, false);
  assert.deepEqual(outOfRange.invalidFields, [
    'prevCredits',
    'prevCgpa',
    'semCredits',
    'semGpa',
  ]);

  const missingArgs = calculateQuickCgpa(null);
  assert.equal(missingArgs.ok, false);
  assert.equal(missingArgs.invalidFields.length, 4);
  assert.equal(calculateQuickCgpa().ok, false);
  assert.equal(calculateQuickCgpa('bad').ok, false);
});

test('calculateExpectedMarks handles all 4 modes including explicit zero Lab and J-Comp', () => {
  // Mode 0: Theory Only (lab & jComp blank/null), al defaults to 0
  const theoryOnly = calculateExpectedMarks({
    cat1: 24,
    cat2: 26,
    da: 25,
    fat: 80,
  });
  // internals = (24+26)*0.5 + 25 + 0 = 50; tot = 50 + 32 = 82
  assert.deepEqual(theoryOnly, {
    ok: true,
    marks: 82,
    formatted: '82.00',
    internals: 50,
    modeLabel: 'Theory Only (100%)',
  });

  // Internals capped at 60
  const cappedInternals = calculateExpectedMarks({
    cat1: 30,
    cat2: 30,
    da: 30,
    al: 10,
    lab: '',
    jComp: '',
    fat: 100,
  });
  assert.equal(cappedInternals.ok, true);
  assert.equal(cappedInternals.internals, 60);
  assert.equal(cappedInternals.marks, 100);

  // Mode 2: Lab = 0 MUST STILL activate Theory + Lab (0.75 * tot + 0 * 0.25)
  const labZero = calculateExpectedMarks({
    cat1: 24,
    cat2: 26,
    da: 25,
    al: '',
    lab: 0,
    jComp: '',
    fat: 80,
  });
  assert.deepEqual(labZero, {
    ok: true,
    marks: 61.5,
    formatted: '61.50',
    internals: 50,
    modeLabel: 'Theory + Lab (75% / 25%)',
  });

  // String '0' for lab also activates Theory + Lab
  const labZeroStr = calculateExpectedMarks({
    cat1: 24,
    cat2: 26,
    da: 25,
    lab: '0',
    fat: 80,
  });
  assert.equal(labZeroStr.marks, 61.5);
  assert.equal(labZeroStr.modeLabel, 'Theory + Lab (75% / 25%)');

  // Mode 1: J-Comp = 0 activates Theory + J-Comp (0.75 * tot + 0 * 0.25)
  const jCompZero = calculateExpectedMarks({
    cat1: 24,
    cat2: 26,
    da: 25,
    lab: null,
    jComp: 0,
    fat: 80,
  });
  assert.deepEqual(jCompZero, {
    ok: true,
    marks: 61.5,
    formatted: '61.50',
    internals: 50,
    modeLabel: 'Theory + J-Comp (75% / 25%)',
  });

  // Mode 3: Both Lab & J-Comp (including lab=0, jComp=80)
  const bothRes = calculateExpectedMarks({
    cat1: 24,
    cat2: 26,
    da: 25,
    al: 5,
    lab: 0,
    jComp: 80,
    fat: 80,
  });
  // internals = min(25 + 25 + 5, 60) = 55; tot = 55 + 32 = 87; net = 87*0.6 + 0 + 80*0.2 = 52.2 + 16 = 68.2
  assert.deepEqual(bothRes, {
    ok: true,
    marks: 68.2,
    formatted: '68.20',
    internals: 55,
    modeLabel: 'Theory + Lab + J-Comp (60% / 20% / 20%)',
  });

  // Invalid fields
  const invalidAll = calculateExpectedMarks({
    cat1: 31,
    cat2: -1,
    da: 'bad',
    al: 11,
    lab: 101,
    jComp: -5,
    fat: 105,
  });
  assert.equal(invalidAll.ok, false);
  assert.deepEqual(invalidAll.invalidFields, [
    'cat1',
    'cat2',
    'da',
    'al',
    'lab',
    'jComp',
    'fat',
  ]);

  assert.equal(calculateExpectedMarks(null).ok, false);
  assert.equal(calculateExpectedMarks().ok, false);
  assert.equal(calculateExpectedMarks('bad').ok, false);
});

test('calculateAllSemCgpa supports 1..12+ semesters and validates partial/range/empty cases', () => {
  // 10 semesters with a skipped blank row in the middle
  const tenSemesters = [
    { gpa: 9.0, credits: 20 },
    { gpa: 8.5, credits: 22 },
    { gpa: '', credits: '' },
    { gpa: 9.2, credits: 24 },
    { gpa: 8.8, credits: 21 },
    { gpa: 9.1, credits: 23 },
    { gpa: 9.4, credits: 20 },
    { gpa: 8.9, credits: 22 },
    { gpa: 9.5, credits: 20 },
    { gpa: 9.0, credits: 20 },
    { gpa: 9.3, credits: 18 },
    { gpa: 9.6, credits: 16 },
    { gpa: 9.7, credits: 12 },
  ];
  const longRes = calculateAllSemCgpa(tenSemesters);
  assert.equal(longRes.ok, true);
  assert.equal(longRes.semesterCount, 12);
  assert.equal(longRes.totalCredits, 238);
  assert.equal(longRes.formatted, '9.13');
  assert.equal(longRes.percentage, '91.31');

  // Empty / non-array / zero credits
  assert.equal(calculateAllSemCgpa([]).ok, false);
  assert.equal(calculateAllSemCgpa(null).ok, false);
  assert.equal(calculateAllSemCgpa([null, { gpa: '', credits: '' }, {}]).ok, false);
  assert.equal(calculateAllSemCgpa([{ gpa: 9, credits: 0 }]).ok, false);

  // Partial rows only
  const partialOnly = calculateAllSemCgpa([
    { gpa: 9, credits: '' },
    { gpa: '', credits: 20 },
  ]);
  assert.deepEqual(partialOnly, {
    ok: false,
    error: 'Enter both GPA and credits for every entered semester.',
    invalidRows: [0, 1],
  });

  // Out-of-range rows only
  const rangeOnly = calculateAllSemCgpa([
    { gpa: 10.5, credits: 20 },
    { gpa: 8.5, credits: 33 },
  ]);
  assert.deepEqual(rangeOnly, {
    ok: false,
    error: 'Semester GPA must be 0–10 and credits must be 0–32.',
    invalidRows: [0, 1],
  });

  // Combined partial + out-of-range
  const mixedInvalid = calculateAllSemCgpa([
    { gpa: 9, credits: '' },
    { gpa: 11, credits: 20 },
  ]);
  assert.deepEqual(mixedInvalid, {
    ok: false,
    error: 'Enter both GPA (0–10) and credits (0–32) for every entered semester.',
    invalidRows: [0, 1],
  });
});
