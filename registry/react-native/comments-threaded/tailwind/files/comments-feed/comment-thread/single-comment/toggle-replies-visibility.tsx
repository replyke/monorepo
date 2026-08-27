import { TouchableOpacity, Text } from "react-native";
import useUIState from "../../../../hooks/use-ui-state";

function ToggleRepliesVisibility({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { theme } = useUIState();

  return (
    <TouchableOpacity
      onPress={onToggleCollapse}
      className={`ml-1 w-4 h-4 items-center justify-center rounded-sm ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      } ${
        isCollapsed
          ? theme === 'dark'
            ? 'border border-gray-500'
            : 'border border-gray-300'
          : ''
      }`}
    >
      <Text
        className={`text-sm font-bold ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        {isCollapsed ? "+" : "−"}
      </Text>
    </TouchableOpacity>
  );
}

export default ToggleRepliesVisibility;
