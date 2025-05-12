// src/lib/formattingUtils.ts

/**
 * Formats a number for display in an input field, using dots for thousands separators.
 * Primarily for integer-like display of costs/prices.
 * @param value The number to format.
 * @returns A string representation of the number with 'es-CO' locale formatting (dots for thousands).
 */
export function formatNumberForInput(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  try {
    // 'es-CO' uses '.' for thousands and ',' for decimals.
    // We ensure no fractional digits for integer-like cost display.
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (e) {
    // Fallback for very large numbers or other Intl.NumberFormat issues
    return String(value);
  }
}

/**
 * Parses a string value (potentially formatted with dots and/or commas) into a number.
 * @param value The string to parse.
 * @returns A number, or null if parsing fails or input is empty.
 */
export function parseFormattedNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  // Remove thousand separators (dots for 'es-CO' or any other locale using dots)
  const valueWithoutThousands = value.replace(/\./g, '');
  // Replace decimal separator (comma for 'es-CO') with a dot for universal parseFloat compatibility
  const valueWithDotDecimal = valueWithoutThousands.replace(',', '.');
  
  const num = parseFloat(valueWithDotDecimal);

  return isNaN(num) ? null : num;
}
