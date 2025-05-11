export const handleError = (err: any, baseMessage?: string) => {
  let messages = [baseMessage ?? ""];

  const responseData = err.response?.data;
  if (responseData) {
    if (responseData.error) {
      messages.push(responseData.error);
    }
    if (responseData.details) {
      messages.push(responseData.details);
    }
  } else {
    // Fallback to the default error message if no response data is available
    messages.push(err.message || "Unknown error");
  }

  console.error(messages.join(" - "));
  return messages.join(" - ");
};