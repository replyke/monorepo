export function isAbsoluteUrl(url: string) {
  // A regular expression to check if the URL starts with http:// or https://
  const regex = /^(http|https):\/\/[^ "]+$/;
  return regex.test(url);
}
