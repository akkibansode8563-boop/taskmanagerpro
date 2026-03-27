"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps {
  endValue: number;
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ endValue, duration = 1000 }) => {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (inView) {
      let startTime: number | null = null;
      const startValue = 0;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);
        const currentCount = Math.floor(startValue + (endValue - startValue) * percentage);
        setCount(currentCount);

        if (progress < duration) {
          animationFrameId.current = requestAnimationFrame(animate);
        } else {
          setCount(endValue);
        }
      };

      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [inView, endValue, duration]);

  return <span ref={ref}>{count}</span>;
};

export default AnimatedCounter;
