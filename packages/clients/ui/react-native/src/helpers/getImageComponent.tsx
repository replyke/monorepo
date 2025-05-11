/**
 * Dynamically loads the Image component.
 * Tries to require expo-image's Image, and if not found, falls back to React Native's Image.
 *
 * @returns {Object} An object containing the ImageComponent and a flag indicating if it's expo-image.
 */
export const getImageComponent = () => {
  let ImageComponent;
  let isExpo = false;
  try {
    // Try to load expo-image's Image component.
    ImageComponent = require("expo-image").Image;
    isExpo = true;
  } catch (error) {
    // Fallback to React Native's Image.
    ImageComponent = require("react-native").Image;
  }
  return { ImageComponent, isExpo };
};
