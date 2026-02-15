import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Comment as CommentType } from "@replyke/core";
import { CommentThreadProps } from "./comment-thread";
import useUIState from "../../../hooks/use-ui-state";

interface CommentRepliesProps {
  depth: number;
  isCollapsed: boolean;
  loading: boolean;
  visibleReplies: CommentType[];
  hiddenRepliesCount: number;
  showAllReplies: boolean;
  onShowAllReplies: () => void;
  onDeleteComment?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
  CommentThreadComponent: React.ComponentType<CommentThreadProps>;
}

function CommentReplies({
  depth,
  isCollapsed,
  loading,
  visibleReplies,
  hiddenRepliesCount,
  showAllReplies,
  onShowAllReplies,
  onDeleteComment,
  onReportComment,
  CommentThreadComponent,
}: CommentRepliesProps) {
  const { theme } = useUIState();

  // Don't render anything if collapsed or no replies
  if (isCollapsed || visibleReplies.length === 0) {
    return null;
  }

  return (
    <View>
      {visibleReplies.map((reply: CommentType, index: number) => (
        <CommentThreadComponent
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          isLastReply={index === visibleReplies.length - 1}
          onDeleteComment={onDeleteComment}
          onReportComment={onReportComment}
        />
      ))}

      {/* Load more replies button */}
      {hiddenRepliesCount > 0 && !showAllReplies && (
        <View className="mt-3 ml-1">
          <TouchableOpacity
            onPress={onShowAllReplies}
            className={`flex-row items-center gap-2 px-2 py-1 rounded-full ${
              theme === 'dark' ? 'active:bg-blue-950' : 'active:bg-blue-50'
            }`}
          >
            <Text
              className={`text-xs ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              +
            </Text>
            <Text
              className={`text-xs font-medium ${
                theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
              }`}
            >
              {hiddenRepliesCount} more{" "}
              {hiddenRepliesCount === 1 ? "reply" : "replies"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default CommentReplies;
