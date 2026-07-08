// Mock SQL Relational Database Adapter representing User Database
export interface UserRecord {
  email: string;
  createdAt: string;
}

// In-memory simulated SQL store
const sqlStore: Map<string, UserRecord> = new Map([
  ["admin@meetinghub.com", { email: "admin@meetinghub.com", createdAt: new Date().toISOString() }]
]);

export const sqlMock = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    console.log(`[SQL DB] SELECT * FROM users WHERE email = '${email}'`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate IO query delay
    return sqlStore.get(email.toLowerCase()) || null;
  },

  async createUser(email: string): Promise<UserRecord> {
    console.log(`[SQL DB] INSERT INTO users (email, created_at) VALUES ('${email}', NOW())`);
    await new Promise(resolve => setTimeout(resolve, 150));
    const user: UserRecord = {
      email: email.toLowerCase(),
      createdAt: new Date().toISOString()
    };
    sqlStore.set(user.email, user);
    return user;
  }
};
