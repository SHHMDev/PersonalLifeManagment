export function nowIso(): string {
  return new Date().toISOString();
}

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function calculatePriorityScore(importance: number, urgency: number, benefit: number): number {
  return importance + urgency + benefit;
}

export function clampScore(value: number): number {
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

export function getNextDueAt(frequencyType: 'daily' | 'weekly' | 'biweekly' | 'monthly', from = new Date()): string {
  const date = new Date(from);
  if (frequencyType === 'daily') date.setDate(date.getDate() + 1);
  if (frequencyType === 'weekly') date.setDate(date.getDate() + 7);
  if (frequencyType === 'biweekly') date.setDate(date.getDate() + 14);
  if (frequencyType === 'monthly') date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

export function extractSubjectDepth(subjectId: number, subjectById: Map<number, { parentSubjectId: number | null }>): number {
  let current = subjectById.get(subjectId);
  let depth = 1;

  while (current?.parentSubjectId) {
    depth += 1;
    current = subjectById.get(current.parentSubjectId);
    if (depth > 3) return depth;
  }

  return depth;
}

export function isValidPersianText(value: string): boolean {
  return value.trim().length > 0;
}
