const deepEqual = function (obj1: any, obj2: any): boolean {
  // Check for strict equality first
  if (obj1 === obj2) {
    return true;
  }

  // Handle cases where either object is null or undefined
  if (obj1 == null || obj2 == null) {
    return obj1 === obj2; // Both must be null or undefined to be considered equal
  }

  // Check if both objects are of the same type
  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  // Handle case where they are arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }

  // Handle case where they are objects (but not arrays)
  if (typeof obj1 === "object" && typeof obj2 === "object") {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // Check if objects have the same number of keys
    if (keys1.length !== keys2.length) {
      return false;
    }

    // Check if all keys and values are deeply equal
    return keys1.every((key) => deepEqual(obj1[key], obj2[key]));
  }

  // Fallback for other data types (like functions, primitives)
  return false;
};

export default deepEqual;
