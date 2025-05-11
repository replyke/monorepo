import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";

const CustomButton = ({
  onPress,
  text,
  activeText,
  error,
  disabled,
  style,
  submitting,
}: {
  onPress: () => void;
  text: string;
  activeText: string;
  style?: StyleProp<ViewStyle>;
  error?: string;
  disabled?: boolean;
  submitting?: boolean;
}) => {
  const baseStyle: ViewStyle = {
    backgroundColor: "#60a5fa",
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  };

  const textStyle: TextStyle = {
    fontSize: 18,
    fontWeight: "500",
    color: "#ffffff",
  };

  const errorStyle: TextStyle = {
    color: "#ef4444",
    marginTop: 4,
  };

  return (
    <View style={style}>
      {disabled ? (
        <View style={{ ...baseStyle, opacity: 0.5, pointerEvents: "none" }}>
          <Text style={textStyle}>{submitting ? activeText : text}</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onPress} style={baseStyle}>
          <Text style={textStyle}>{submitting ? activeText : text}</Text>
        </TouchableOpacity>
      )}

      {error && <Text style={errorStyle}>{error}</Text>}
    </View>
  );
};

export default CustomButton;
