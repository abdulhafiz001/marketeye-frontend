const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const DISPLAY_NAME = /^[\p{L}][\p{L}\s'-]{0,78}[\p{L}]$/u;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.replace(/\D+/g, '');
}

export function isValidEmailShape(value: string): boolean {
  return EMAIL_SHAPE.test(normalizeEmail(value));
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidDisplayName(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 80 && DISPLAY_NAME.test(name);
}

export function validateSignupInput(input: { name: string; email: string; password: string; phone?: string }): string | null {
  const nameError = validateProfileName(input.name);
  if (nameError) {
    return nameError;
  }
  if (!input.email.trim() || !input.password) {
    return 'Please enter your name, email, and password.';
  }
  if (!isValidEmailShape(input.email)) {
    return 'Enter a real email address, like you@example.com.';
  }
  if (input.password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (input.phone?.trim() && !isValidPhone(input.phone)) {
    return 'Phone must be 10 to 15 digits.';
  }
  return null;
}

export function validateLoginInput(login: string, password: string): string | null {
  const value = login.trim();
  if (!value || !password) {
    return 'Enter your email or phone and password.';
  }
  if (value.includes('@')) {
    if (!isValidEmailShape(value)) {
      return 'Enter a real email address, like you@example.com.';
    }
  } else if (!isValidPhone(value)) {
    return 'Enter a valid email or a 10 to 15 digit phone number.';
  }
  return null;
}

export function validateProfileName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Add a display name in your profile.';
  }
  if (!isValidDisplayName(trimmed)) {
    return 'Name must be 2–80 letters. Use only letters, spaces, hyphens, or apostrophes.';
  }
  return null;
}

export function displayFirstName(user?: { name?: string | null; email?: string | null } | null): string | null {
  const name = user?.name?.trim();
  if (name) {
    return name.split(/\s+/)[0] ?? name;
  }
  return null;
}

export function avatarInitial(user?: { name?: string | null; email?: string | null } | null): string {
  const name = user?.name?.trim();
  if (name) {
    return name[0]!.toUpperCase();
  }
  const email = user?.email?.trim();
  if (email) {
    return email[0]!.toUpperCase();
  }
  return 'U';
}

export function profileDisplayName(user?: { name?: string | null; email?: string | null } | null): string {
  return user?.name?.trim() || user?.email?.trim() || 'Guest User';
}
