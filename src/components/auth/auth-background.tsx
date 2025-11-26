'use client';

import { Fingerprint } from "lucide-react";

export function AuthBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
    </div>
  );
}
