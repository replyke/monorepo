import { useRef, useEffect } from "react";

const InfiniteScrollTrigger = ({
  onTriggered,
}: {
  onTriggered: () => void;
}) => {
  const commentsEndRef = useRef(null);

  useEffect(() => {
    const currentEndRef = commentsEndRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onTriggered();
        }
      },
      {
        root: null, // Use the document's viewport as the container
        rootMargin: "0px",
        threshold: 0.1, // Trigger when 10% of the target is visible
      }
    );

    if (currentEndRef) {
      observer.observe(currentEndRef);
    }

    return () => {
      if (currentEndRef) {
        observer.unobserve(currentEndRef);
      }
    };
  }, [onTriggered]);

  return <div ref={commentsEndRef} style={{ height: 1 }} />;
};

export default InfiniteScrollTrigger;
