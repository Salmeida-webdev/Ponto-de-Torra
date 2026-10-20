export function normalizeBrazilianPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? digits : null;
}
