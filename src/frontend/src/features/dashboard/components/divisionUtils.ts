export const normalizeDivisionLabelValue = (label: string | null | undefined, unknownLabel: string): string => {
  if (!label) return unknownLabel;
  const trimmed = label.trim();
  if (!trimmed) return unknownLabel;

  const normalized = trimmed.toLowerCase();
  if (normalized === 'unassigned division' || normalized === 'unassigned' || normalized === 'no division') {
    return unknownLabel;
  }

  return trimmed;
};

export const matchesSelectedDivisionValue = (
  studentDivision: string | null | undefined,
  selectedDivision: string,
  unknownLabel: string
): boolean => {
  if (!selectedDivision) return true;
  return normalizeDivisionLabelValue(studentDivision, unknownLabel) === selectedDivision;
};
