import { useEffect, useRef, useState } from 'react';

// Smoothly animates a number towards `target` using requestAnimationFrame with
// cubic ease-out, so gauge values glide instead of jumping.
export default function useAnimatedNumber(target, duration = 700) {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const from = currentRef.current;
    if (from === target) return undefined;

    let raf = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      currentRef.current = value;
      setDisplay(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      currentRef.current = target;
    };
  }, [target, duration]);

  return display;
}
