"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * MobileRedirect
 * Renders nothing. On mount (client-only), checks screen width.
 * If the viewport is narrower than 768 px (phone/small tablet),
 * silently replaces the current route with the dedicated mobile route.
 *
 * Safe: runs only in the browser. Does NOT use middleware or server logic.
 */
export function MobileRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    const isMobile =
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile) {
      router.replace(to);
    }
  }, [router, to]);

  return null;
}
