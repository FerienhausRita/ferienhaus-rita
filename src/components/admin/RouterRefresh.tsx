"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Invisible client component that forces a router.refresh()
 * whenever the pathname changes via client-side navigation.
 *
 * This ensures admin pages always show fresh server data
 * instead of stale Router Cache entries.
 */
export default function RouterRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      router.refresh();
    }
  }, [pathname, router]);

  return null;
}
