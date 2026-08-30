import React from "react";
import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

const FlagIcon: React.FC<IconProps> = ({ size = 20, color = "#DC2626" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M14.27 1.48a1.3 1.3 0 0 0-.65.18 6.32 6.32 0 0 1-3 1.1c-1.66 0-3.65-1-5.65-1a11.41 11.41 0 0 0-3.18.46v-.09a.63.63 0 0 0-1.25 0v11.76a.63.63 0 1 0 1.25 0V11a10.56 10.56 0 0 1 3.18-.46c1.66 0 4.4 1 6.45 1A5.86 5.86 0 0 0 15 10.11a1.17 1.17 0 0 0 .47-.93V2.66a1.21 1.21 0 0 0-1.2-1.18zm0 7.65a4.58 4.58 0 0 1-2.87 1.08 17.73 17.73 0 0 1-3.29-.49 16 16 0 0 0-3.16-.48A12.3 12.3 0 0 0 2 9.57v-6.1A9.85 9.85 0 0 1 4.93 3a11.59 11.59 0 0 1 2.78.48 11.9 11.9 0 0 0 2.87.52 7.5 7.5 0 0 0 3.67-1.27z"
        fill={color}
      />
    </Svg>
  );
};

export default FlagIcon;
