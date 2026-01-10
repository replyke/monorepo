import React from "react";
import Svg, { Path } from "react-native-svg";

interface MagnifyingGlassIconProps {
  color?: string;
  width?: number;
  height?: number;
}

const MagnifyingGlassIcon: React.FC<MagnifyingGlassIconProps> = ({
  color = "#000000",
  width = 24,
  height = 24,
}) => (
  <Svg viewBox="0 0 256 256" width={width} height={height} fill="none">
    <Path
      d="M232.47656,215.51563l-40.67773-40.67774a96.10791,96.10791,0,1,0-16.97168,16.96973l40.67871,40.67871a12.0001,12.0001,0,1,0,16.9707-16.9707ZM43.99707,116a72,72,0,1,1,72,72A72.08124,72.08124,0,0,1,43.99707,116Z"
      fill={color}
    />
  </Svg>
);

export default MagnifyingGlassIcon;
