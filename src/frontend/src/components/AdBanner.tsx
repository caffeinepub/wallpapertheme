import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      const ads = window.adsbygoogle ?? [];
      window.adsbygoogle = ads;
      window.adsbygoogle.push({});
    } catch {}
  }, []);

  return (
    <div
      ref={ref}
      className="w-full flex justify-center py-1"
      style={{
        background: "rgba(0,0,0,0.3)",
        borderTop: "1px solid rgba(200,80,255,0.15)",
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client="ca-pub-4908163247342893"
        data-ad-slot="8709641053"
      />
    </div>
  );
}
