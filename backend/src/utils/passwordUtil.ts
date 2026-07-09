import bcrypt from 'bcrypt';

export async function hash(
  password: string,
  salt?: string,
): Promise<{ password: string; salt: string; passwordHash: string }> {
  if (!salt) {
    salt = await bcrypt.genSalt(10);
  }

  const passwordHash = await bcrypt.hash(password, salt);

  return {
    password,
    salt,
    passwordHash,
  };
}
