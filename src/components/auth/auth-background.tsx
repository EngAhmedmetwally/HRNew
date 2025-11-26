'use client';

import { Fingerprint } from "lucide-react";

export function AuthBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <Fingerprint className="absolute -bottom-1/4 -right-1/4 h-[50rem] w-[50rem] text-primary/5 -rotate-45" />
        <Fingerprint className="absolute -top-1/4 -left-1/4 h-[40rem] w-[40rem] text-accent/5 rotate-12" />
    </div>
  );
}
