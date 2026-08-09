export function isAllowedNumber(number: string, allowedNumbers: string): boolean {
  const allowed = allowedNumbers.split(",").map((n) => n.trim());
  return allowed.includes(number);
}
