import { cn } from "@/lib/utils";

export function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-white/80", className)}
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-2" />
      <path d="M5 18a2 2 0 0 1 .86-1.74" />
      <path d="M10 6.5a2 2 0 0 1 4 0" />
      <path d="M14 4.5a4 4 0 0 0-3.5-2" />
      <path d="M20 16a6 6 0 0 0-6-6" />
      <path d="M12 12v.95" />
      <path d="M18.82 19.53c.13-.58.28-1.2.38-1.53" />
      <path d="M9.13 18.39c.2-.78.48-2.19.7-3.39" />
      <path d="M7.1 16.5c.21-1.2.54-3.3.7-4.5" />
      <path d="M3 16a3 3 0 0 1 3-3" />
    </svg>
  );
}
