import React from "react";

interface EllipsisIconProps {
  color?: string;
  width?: number;
  height?: number;
}

const EllipsisIcon: React.FC<EllipsisIconProps> = ({
  color = "#8E8E8E",
  width = 16,
  height = 16,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

export default EllipsisIcon;
