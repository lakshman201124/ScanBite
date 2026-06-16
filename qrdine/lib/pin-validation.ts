/**
 * PIN strength validation rules (server-enforced).
 * Minimum 6 digits, no all-same, no sequential runs.
 */
export function validatePinStrength(pin: string): { valid: boolean; error?: string } {
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: "PIN must contain digits only." };
  }
  if (pin.length < 6) {
    return { valid: false, error: "PIN must be at least 6 digits." };
  }
  if (pin.length > 8) {
    return { valid: false, error: "PIN must be at most 8 digits." };
  }

  // All same digits (111111, 222222, …)
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, error: "PIN cannot be all the same digit." };
  }

  // Sequential ascending or descending run of any length ≥ 4
  const digits = pin.split("").map(Number);
  let ascRun = 1, descRun = 1;
  for (let i = 1; i < digits.length; i++) {
    ascRun  = digits[i] === digits[i - 1] + 1 ? ascRun + 1 : 1;
    descRun = digits[i] === digits[i - 1] - 1 ? descRun + 1 : 1;
    if (ascRun >= 4 || descRun >= 4) {
      return { valid: false, error: "PIN cannot contain sequential digits (e.g. 1234, 9876)." };
    }
  }

  return { valid: true };
}
