export default function sanitizeUsername(input: string) {
  // Regex to match allowed characters (letters, digits, underscores, and periods)
  const regex = /[^a-zA-Z0-9._]/g;
  // Replace disallowed characters with an empty string
  return input.replace(regex, "");
}

