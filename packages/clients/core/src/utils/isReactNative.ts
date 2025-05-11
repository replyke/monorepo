export const isReactNative = () =>
  typeof navigator !== "undefined" && navigator.product === "ReactNative";
