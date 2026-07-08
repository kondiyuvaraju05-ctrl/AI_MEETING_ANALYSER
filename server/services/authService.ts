import { sqlMock } from "../db/sqlMock";

export const authService = {
  async handleLogin(email: string) {
    console.log(`[Auth Service] Processing login request for user: ${email}`);
    let user = await sqlMock.findUserByEmail(email);
    if (!user) {
      console.log(`[Auth Service] User not found. Creating user account automatically...`);
      user = await sqlMock.createUser(email);
    }
    // Generate a mock auth token
    const token = `token_${Math.random().toString(36).substring(2)}`;
    return {
      success: true,
      email: user.email,
      token,
      createdAt: user.createdAt
    };
  }
};
