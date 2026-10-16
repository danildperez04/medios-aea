process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_NAME = process.env.DATABASE_NAME ?? 'medios_aea_test';
process.env.DATABASE_SYNCHRONIZE = 'false';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-only-for-jest-not-for-production-use-32';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '4';
