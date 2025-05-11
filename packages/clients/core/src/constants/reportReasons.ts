export const reportReasons = {
  spam: "It's spam",
  inappropriateContent: "Contains inappropriate content",
  harassment: "It's harassment or bullying",
  misinformation: "Spreads false information",
  hateSpeech: "Contains hate speech or symbols",
  violence: "Promotes violence or dangerous behavior",
  illegalActivity: "Promotes illegal activity",
  selfHarm: "Promotes self-harm or suicide",
  other: "Other",
};

export type ReportReasonKey = keyof typeof reportReasons;
