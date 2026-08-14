"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function QrCode({
  value,
  active = true,
  label = "QR code",
}: {
  value: string;
  active?: boolean;
  label?: string;
}) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then(({ toDataURL }) =>
      toDataURL(value, {
        width: 520,
        margin: 1,
        color: { dark: "#211c18", light: "#ffffff" },
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) setSrc(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className={`club-qr ${active ? "club-qr--active" : "club-qr--inactive"}`}>
      {src ? <Image src={src} alt={label} width={520} height={520} unoptimized /> : <span>Preparing QR code…</span>}
    </div>
  );
}
