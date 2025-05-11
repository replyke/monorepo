import rateLimit from "express-rate-limit";
import ms, { StringValue } from "ms";

export const rateLimiter = (
  window: StringValue,
  max: number,
  message?: string
) => {
  const windowMs = ms(window); // Convert human-readable time to milliseconds

  if (!windowMs) {
    throw new Error(`Invalid time format: ${window}`);
  }

  return rateLimit({
    windowMs,
    max,
    message: message ?? "Too many attempts, please try again shortly",
  });
};
