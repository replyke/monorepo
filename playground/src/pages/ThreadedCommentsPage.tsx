import React, { useState } from "react";
import ThreadedCommentSectionStyled from "../../../registry/react/comments-threaded/styled/files/threaded-comment-section";
import ThreadedCommentSectionTailwind from "../../../registry/react/comments-threaded/tailwind/files/threaded-comment-section";

type StyleVariant = "styled" | "tailwind";

const FOREIGN_ID = "playground-threaded-comments";

export default function ThreadedCommentsPage() {
  const [variant, setVariant] = useState<StyleVariant>("styled");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>comments-threaded</h2>
        <VariantToggle value={variant} onChange={setVariant} />
        <ThemeToggle value={theme} onChange={setTheme} />
      </div>

      <div
        style={{ maxWidth: 700, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}
        className={theme === "dark" ? "dark" : ""}
      >
        {variant === "styled" ? (
          <ThreadedCommentSectionStyled
            foreignId={FOREIGN_ID}
            isVisible={true}
            theme={theme}
          />
        ) : (
          <ThreadedCommentSectionTailwind
            foreignId={FOREIGN_ID}
            isVisible={true}
          />
        )}
      </div>
    </div>
  );
}

function VariantToggle({ value, onChange }: { value: StyleVariant; onChange: (v: StyleVariant) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 6, padding: 2 }}>
      {(["styled", "tailwind"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: "3px 10px", borderRadius: 5, border: "none",
          background: value === v ? "#fff" : "transparent",
          boxShadow: value === v ? "0 1px 2px rgba(0,0,0,.1)" : "none",
          color: value === v ? "#111" : "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: value === v ? 600 : 400,
        }}>
          {v}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ value, onChange }: { value: "light" | "dark"; onChange: (v: "light" | "dark") => void }) {
  return (
    <button onClick={() => onChange(value === "light" ? "dark" : "light")} style={{
      marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
      background: value === "dark" ? "#1f2937" : "#fff",
      color: value === "dark" ? "#f9fafb" : "#374151", cursor: "pointer", fontSize: 13,
    }}>
      {value === "light" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
