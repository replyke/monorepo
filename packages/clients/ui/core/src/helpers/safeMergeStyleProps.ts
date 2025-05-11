// Custom merge function
export const safeMergeStyleProps = <T>(
  ...objects: (Partial<T> | undefined)[]
): T => {
  return objects.reduce<T>((acc, obj) => {
    if (obj) {
      Object.keys(obj).forEach((key) => {
        const value = obj[key as keyof T];
        if (value !== undefined) {
          acc[key as keyof T] = value;
        }
      });
    }
    return acc;
  }, {} as T);
};
