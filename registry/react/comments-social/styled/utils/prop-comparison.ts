// Utility functions for prop comparison and stability checks
import { isDevelopment } from "@replyke/react-js";

/**
 * Performs shallow equality check for objects
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (!obj1 || !obj2 || typeof obj1 !== "object" || typeof obj2 !== "object") {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!(key in obj2) || obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Performs deep equality check for nested objects and arrays
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== "object") {
    return obj1 === obj2;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!(key in obj2)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Development-only function to warn about prop changes
 */
export function warnPropChanges(
  componentName: string,
  prevProps: Record<string, any>,
  nextProps: Record<string, any>,
  propNames: string[]
): void {
  if (!isDevelopment()) {
    return;
  }

  for (const propName of propNames) {
    const prevValue = prevProps[propName];
    const nextValue = nextProps[propName];

    if (prevValue !== nextValue && !deepEqual(prevValue, nextValue)) {
      console.warn(
        `[${componentName}] Prop '${propName}' changed but has the same content. ` +
          `Consider memoizing this prop to prevent unnecessary re-renders.`,
        { prevValue, nextValue }
      );
    }
  }
}
