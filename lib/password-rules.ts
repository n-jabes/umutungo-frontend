export type PasswordChecks = {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
};

export const PASSWORD_MIN_LENGTH = 8;

export function evaluatePassword(password: string): PasswordChecks {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };
}

export function passwordMeetsAllRules(checks: PasswordChecks): boolean {
  return (
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasDigit &&
    checks.hasSpecial
  );
}

export const PASSWORD_RULE_LABELS: { key: keyof PasswordChecks; label: string }[] = [
  { key: "minLength", label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { key: "hasUpper", label: "One uppercase letter" },
  { key: "hasLower", label: "One lowercase letter" },
  { key: "hasDigit", label: "One number" },
  { key: "hasSpecial", label: "One special character (!@#…)" },
];
