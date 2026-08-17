import jwt from "jsonwebtoken";
import { sqlMock } from "../db/sqlMock.js";

const JWT_SECRET = process.env.JWT_SECRET || "ai_meeting_assistant_jwt_secret_key_2026_super_secure";

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigit: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push("Password must be at least 6 characters long.");
  if (!hasUppercase) errors.push("Password must contain at least one uppercase letter (A-Z).");
  if (!hasLowercase) errors.push("Password must contain at least one lowercase letter (a-z).");
  if (!hasDigit) errors.push("Password must contain at least one digit (0-9).");

  return {
    isValid: hasMinLength && hasUppercase && hasLowercase && hasDigit,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    errors,
  };
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export const authService = {
  async register(emailInput: string, passwordInput: string) {
    const email = normalizeEmail(emailInput);
    console.log(`[Auth Service] Registering user: ${email}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format.");
    }

    // Validate password complexity
    const passwordValidation = validatePassword(passwordInput);
    if (!passwordValidation.isValid) {
      throw new Error(`Password does not meet security requirements: ${passwordValidation.errors.join(" ")}`);
    }

    // Check duplicate account
    const existingUser = await sqlMock.findUserByEmail(email);
    if (existingUser) {
      return {
        alreadyExists: true,
        message: `An account for ${email} already exists. Please sign in instead.`,
        email,
      };
    }

    // Create new user account
    const user = await sqlMock.createUser(email);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  },

  async login(emailInput: string, passwordInput?: string) {
    const email = normalizeEmail(emailInput);
    console.log(`[Auth Service] Login attempt for user: ${email}`);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format.");
    }

    const user = await sqlMock.findUserByEmail(email);
    if (!user) {
      return {
        notFound: true,
        message: `Account '${email}' was not found in the database. Please register your account.`,
        email,
      };
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  },

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      return decoded;
    } catch (err) {
      return null;
    }
  },
};
