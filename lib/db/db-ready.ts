export function isDatabaseReady() {
  return Boolean(process.env.DATABASE_URL);
}
