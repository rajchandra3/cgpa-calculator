/**
 * Round a finite number to two decimal places; returns 0 for non-finite values.
 * @param {number} num
 * @returns {number}
 */
export function roundToTwo(num) {
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Format a numeric score with exactly two decimal places.
 * @param {number} num
 * @returns {string}
 */
export function formatScore(num) {
  return roundToTwo(num).toFixed(2);
}

/**
 * Parse an optional input value: returns null for blank/null/undefined,
 * a finite number when valid, or NaN for invalid inputs.
 * @param {unknown} val
 * @returns {number | null}
 */
export function parseOptionalNumber(val) {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : NaN;
  }
  if (typeof val !== 'string') return NaN;
  const trimmed = val.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isInRange(val, min, max) {
  return val !== null && !Number.isNaN(val) && val >= min && val <= max;
}

/**
 * Calculate semester GPA from course rows [{ grade, credits }].
 * @param {Array<{ grade: unknown, credits: unknown }>} rows
 */
export function calculateGpa(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const invalidRows = [];
  let totalPoints = 0;
  let totalCredits = 0;
  let courseCount = 0;

  for (let i = 0; i < list.length; i += 1) {
    const row = list[i] || {};
    const gradeVal = parseOptionalNumber(row.grade);
    const creditVal = parseOptionalNumber(row.credits);
    const hasGrade = gradeVal !== null;
    const hasCredit = creditVal !== null;

    if (!hasGrade && !hasCredit) continue;

    if (
      hasGrade !== hasCredit ||
      !isInRange(gradeVal, 0, 10) ||
      Number.isNaN(creditVal) ||
      creditVal < 0
    ) {
      invalidRows.push(i);
      continue;
    }

    totalPoints += gradeVal * creditVal;
    totalCredits += creditVal;
    courseCount += 1;
  }

  if (invalidRows.length > 0) {
    return {
      ok: false,
      error: 'Select both grade and credits for every entered course.',
      invalidRows,
    };
  }

  if (courseCount === 0 || totalCredits <= 0) {
    return {
      ok: false,
      error: 'Enter at least one course with grade and credits.',
    };
  }

  const raw = totalPoints / totalCredits;
  return {
    ok: true,
    gpa: roundToTwo(raw),
    formatted: formatScore(raw),
    totalCredits: roundToTwo(totalCredits),
    courseCount,
    percentage: formatScore(raw * 10),
  };
}

/**
 * Calculate cumulative CGPA from previous totals and current semester GPA/credits.
 */
export function calculateQuickCgpa(input = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const prevCredits = parseOptionalNumber(data.prevCredits);
  const prevCgpa = parseOptionalNumber(data.prevCgpa);
  const semCredits = parseOptionalNumber(data.semCredits);
  const semGpa = parseOptionalNumber(data.semGpa);

  const invalidFields = [];
  if (!isInRange(prevCredits, 0, 250)) invalidFields.push('prevCredits');
  if (!isInRange(prevCgpa, 0, 10)) invalidFields.push('prevCgpa');
  if (!isInRange(semCredits, 0, 39)) invalidFields.push('semCredits');
  if (!isInRange(semGpa, 0, 10)) invalidFields.push('semGpa');

  if (invalidFields.length > 0) {
    return {
      ok: false,
      error: 'Enter valid numbers within range (Prev Credits 0–250, Sem Credits 0–39, GPA/CGPA 0–10).',
      invalidFields,
    };
  }

  const totalCredits = prevCredits + semCredits;
  if (totalCredits <= 0) {
    return {
      ok: false,
      error: 'Total credits (previous + current semester) must be greater than 0.',
      invalidFields: ['prevCredits', 'semCredits'],
    };
  }

  const raw = (prevCgpa * prevCredits + semGpa * semCredits) / totalCredits;
  return {
    ok: true,
    cgpa: roundToTwo(raw),
    formatted: formatScore(raw),
    totalCredits: roundToTwo(totalCredits),
    percentage: formatScore(raw * 10),
  };
}

/**
 * Calculate VIT Expected Marks across Theory-only, Theory+Lab, Theory+J-Comp,
 * and Theory+Lab+J-Comp modes. Zero scores in Lab or J-Comp still activate their weight.
 */
export function calculateExpectedMarks(input = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const cat1 = parseOptionalNumber(data.cat1);
  const cat2 = parseOptionalNumber(data.cat2);
  const da = parseOptionalNumber(data.da);
  const rawAl = parseOptionalNumber(data.al === undefined ? 0 : data.al);
  const al = rawAl === null ? 0 : rawAl;
  const lab = parseOptionalNumber(data.lab === undefined ? null : data.lab);
  const jComp = parseOptionalNumber(data.jComp === undefined ? null : data.jComp);
  const fat = parseOptionalNumber(data.fat);

  const invalidFields = [];
  if (!isInRange(cat1, 0, 30)) invalidFields.push('cat1');
  if (!isInRange(cat2, 0, 30)) invalidFields.push('cat2');
  if (!isInRange(da, 0, 30)) invalidFields.push('da');
  if (!isInRange(al, 0, 10)) invalidFields.push('al');
  if (lab !== null && !isInRange(lab, 0, 100)) invalidFields.push('lab');
  if (jComp !== null && !isInRange(jComp, 0, 100)) invalidFields.push('jComp');
  if (!isInRange(fat, 0, 100)) invalidFields.push('fat');

  if (invalidFields.length > 0) {
    return {
      ok: false,
      error: 'Enter valid marks within range (CAT/DA 0–30, Additional Learning 0–10, FAT/Lab/J-Comp 0–100).',
      invalidFields,
    };
  }

  const hasLab = lab !== null;
  const hasJComp = jComp !== null;
  const internals = Math.min((cat1 + cat2) * 0.5 + da + al, 60);
  const tot = internals + fat * 0.4;

  let netMarks;
  let modeLabel;
  if (hasLab && hasJComp) {
    netMarks = tot * 0.6 + lab * 0.2 + jComp * 0.2;
    modeLabel = 'Theory + Lab + J-Comp (60% / 20% / 20%)';
  } else if (hasLab) {
    netMarks = tot * 0.75 + lab * 0.25;
    modeLabel = 'Theory + Lab (75% / 25%)';
  } else if (hasJComp) {
    netMarks = tot * 0.75 + jComp * 0.25;
    modeLabel = 'Theory + J-Comp (75% / 25%)';
  } else {
    netMarks = tot;
    modeLabel = 'Theory Only (100%)';
  }

  return {
    ok: true,
    marks: roundToTwo(netMarks),
    formatted: formatScore(netMarks),
    internals: roundToTwo(internals),
    modeLabel,
  };
}

/**
 * Calculate overall CGPA across an arbitrary list of semesters [{ gpa, credits }].
 * @param {Array<{ gpa: unknown, credits: unknown }>} semesters
 */
export function calculateAllSemCgpa(semesters) {
  const list = Array.isArray(semesters) ? semesters : [];
  const invalidRows = [];
  let hasPartial = false;
  let hasOutOfRange = false;
  let weightedSum = 0;
  let totalCredits = 0;
  let semesterCount = 0;

  for (let i = 0; i < list.length; i += 1) {
    const row = list[i] || {};
    const gpaVal = parseOptionalNumber(row.gpa);
    const creditVal = parseOptionalNumber(row.credits);
    const hasGpa = gpaVal !== null;
    const hasCredit = creditVal !== null;

    if (!hasGpa && !hasCredit) continue;

    if (hasGpa !== hasCredit) {
      hasPartial = true;
      invalidRows.push(i);
      continue;
    }

    if (!isInRange(gpaVal, 0, 10) || !isInRange(creditVal, 0, 32)) {
      hasOutOfRange = true;
      invalidRows.push(i);
      continue;
    }

    weightedSum += gpaVal * creditVal;
    totalCredits += creditVal;
    semesterCount += 1;
  }

  if (invalidRows.length > 0) {
    let error;
    if (hasPartial && hasOutOfRange) {
      error = 'Enter both GPA (0–10) and credits (0–32) for every entered semester.';
    } else if (hasPartial) {
      error = 'Enter both GPA and credits for every entered semester.';
    } else {
      error = 'Semester GPA must be 0–10 and credits must be 0–32.';
    }
    return {
      ok: false,
      error,
      invalidRows,
    };
  }

  if (semesterCount === 0 || totalCredits <= 0) {
    return {
      ok: false,
      error: 'Enter at least one semester with GPA and positive credits.',
      invalidRows: [],
    };
  }

  const raw = weightedSum / totalCredits;
  return {
    ok: true,
    cgpa: roundToTwo(raw),
    formatted: formatScore(raw),
    totalCredits: roundToTwo(totalCredits),
    semesterCount,
    percentage: formatScore(raw * 10),
  };
}
