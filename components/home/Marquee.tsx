import type { ReactNode } from 'react';

export function Marquee({ items }: { items: ReactNode[] }) {
  if (items.length === 0) return null;
  const reps = Math.max(1, Math.ceil(8 / items.length));
  const half = Array.from({ length: reps }).flatMap(() => items);
  const track = [...half, ...half];
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {track.map((item, i) => (
          <li key={i} aria-hidden={i >= half.length} className="mr-3 shrink-0">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
