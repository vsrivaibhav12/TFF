/**
 * One password rule for the whole app. Not marked server-only so forms can use it.
 * The Supabase Auth setting (Auth -> Providers -> Email -> minimum length) should
 * match MIN_PASSWORD_LENGTH.
 */
export const MIN_PASSWORD_LENGTH = 10;

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and numbers';
  }
  return null;
}
