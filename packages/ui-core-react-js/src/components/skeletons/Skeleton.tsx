import React from "react";

function Skeleton({ style }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      <style>
        {`
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
      }
    `}
      </style>
      <div
        style={{
          animation: "pulse 1.5s ease-in-out infinite",
          width: "100%",
          height: 16,
          borderRadius: 8,
          backgroundColor: "#efefef",
          ...style,
        }}
      />
    </>
  );
}

function CommentSkeleton({
  extraLeftPadding = 0,
}: {
  extraLeftPadding?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        width: "100%",
        paddingLeft: 16 + extraLeftPadding,
      }}
    >
      <Skeleton style={{ height: 32, width: 32, borderRadius: "50%" }} />
      <div style={{ display: "grid", gap: "8px", flex: 1 }}>
        <Skeleton style={{ width: "30%", height: 12 }} />
        <Skeleton style={{ height: 12 }} />
        <Skeleton style={{ width: "15%", height: 12 }} />
      </div>
    </div>
  );
}

function UserMentionSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        width: "100%",
        alignItems: "center",
      }}
    >
      <Skeleton
        style={{ height: "35px", width: "35px", borderRadius: "100%" }}
      />
      <div style={{ flex: 1 }}>
        <Skeleton />
      </div>
    </div>
  );
}

export { CommentSkeleton, UserMentionSkeleton, Skeleton };
