"use client"; // zwingt Next.js, das nur auf Client zu rendern

export default function AnimatedStripes() {
  return (
    <div className="fixed inset-0 w-screen h-screen pointer-events-none z-0">
      {Array.from({ length: 120 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 w-full h-1/2 bg-gradient-to-r from-white/20 via-white/10 to-white/20 animate-stripe"
          style={{
            top: `${(i / 120) * 100}%`,
            animationDuration: `${5 + i * 0.02}s`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
