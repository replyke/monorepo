// Minimal stand-in for `react-native`, aliased in by vitest.config.ts.
//
// The real package ships Flow-typed source that Vite cannot parse, and these
// tests do not render anything — they inspect the React element tree that
// parseContentWithMentions() returns. A unique marker object is enough for an
// assertion to confirm the right component was used.
export const Text = "RN_TEXT_STUB";
