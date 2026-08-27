import { useEffect, useRef, useState } from "react";

function useWidth() {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (entries[0].contentRect) {
        setWidth(entries[0].contentRect.width);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    const currentRef = ref.current;
    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
    };
  }, []);

  return [width, ref] as const;
}

export default useWidth;
