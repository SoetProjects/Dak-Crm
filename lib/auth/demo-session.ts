import { cookies } from "next/headers";

const DEMO_SESSION_COOKIE = "dakcrm_demo_session";
const DEMO_SESSION_VALUE = "active";

export async function hasDemoSession() {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_SESSION_COOKIE)?.value === DEMO_SESSION_VALUE;
}

export { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE };
