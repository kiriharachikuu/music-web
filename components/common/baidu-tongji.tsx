"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

export function BaiduTongji() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleRouteChange = () => {
      if ((window as any)._hmt) {
        (window as any)._hmt.push(['_trackPageview', pathname + searchParams.toString()]);
      }
    };

    handleRouteChange();
  }, [pathname, searchParams]);

  return (
    <>
      <Script
        id="baidu-tongji-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `var _hmt = _hmt || [];`,
        }}
      />
      <Script
        id="baidu-tongji-script"
        strategy="afterInteractive"
        src="https://hm.baidu.com/hm.js?df915bf8e74365f954cd86475ceee6f8"
      />
    </>
  );
}
