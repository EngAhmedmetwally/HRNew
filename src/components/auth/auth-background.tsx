'use client';

export function AuthBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 75% 25%, hsl(var(--primary)/0.1), transparent 30%), radial-gradient(circle at 25% 75%, hsl(var(--accent)/0.1), transparent 30%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '2rem 2rem',
          maskImage: 'radial-gradient(ellipse at center, white 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, white 20%, transparent 70%)',
        }}
      ></div>
    </div>
  );
}
