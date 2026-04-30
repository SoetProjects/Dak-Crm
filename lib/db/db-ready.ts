/**
 * Returns true only when DATABASE_URL is set **and** looks like a valid
 * PostgreSQL connection string.
 *
 * Checking the URL format (not just presence) catches the common mistake of
 * setting DATABASE_URL to an empty string or a placeholder value, which would
 * pass a simple Boolean check but still cause Prisma to throw at runtime.
 */
export function isDatabaseReady(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}
