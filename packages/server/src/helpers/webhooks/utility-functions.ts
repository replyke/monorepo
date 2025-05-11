import crypto from "crypto";
import axios, { AxiosError } from "axios";

/**
 * Generate an HMAC signature for a given payload and timestamp.
 */
export function generateHmacSignature(
  payload: any,
  timestamp: number,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest("hex");
}

/**
 * Validate an HMAC signature.
 */
export function validateHmacSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return signature === expectedSignature;
}

/**
 * Send a webhook request to the given URL with the specified data and headers.
 */
export async function sendWebhookRequest(
  webhookUrl: string,
  payload: any,
  secret: string
): Promise<any> {
  const timestamp = Date.now();
  const signature = generateHmacSignature(payload, timestamp, secret);

  return axios.post(webhookUrl, payload, {
    headers: {
      "X-Signature": signature,
      "X-Timestamp": timestamp.toString(),
    },
  });
}

/**
 * Send a webhook request to the given URL with the specified data and headers.
 */
export async function sendWebhookRequestWithHandle(
  webhookUrl: string,
  payload: any,
  secret: string
): Promise<any> {
  try {
    const response = await sendWebhookRequest(webhookUrl, payload, secret);

    // Validate the response signature if it exists
    const responseSignature = response.headers["x-response-signature"];
    if (!responseSignature) {
      throw new Error("Missing response signature");
    }

    if (!validateHmacSignature(response.data, responseSignature, secret)) {
      throw new Error("Invalid response signature");
    }

    return response.data;
  } catch (err) {
    handleWebhookError(err, "Webhook request failed");
  }
}

/**
 * Handle errors during webhook requests.
 */
export function handleWebhookError(err: any, defaultMessage: string) {
  if (err instanceof AxiosError) {
    console.error(defaultMessage, err.response?.data || err.message);
    throw new Error(err.response?.data?.error || defaultMessage);
  }
  console.error(defaultMessage, err);
  throw new Error(defaultMessage);
}
