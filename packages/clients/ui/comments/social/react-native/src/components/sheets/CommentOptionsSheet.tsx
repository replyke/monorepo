import { View, Text, Pressable, Alert } from "react-native";
import { useCallback, useMemo } from "react";
import { useUser, useCommentSection } from "@replyke/core";
import { FlagIcon, TrashIcon } from "@replyke/ui-core-react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import useSheetManager from "../../hooks/useSheetManager";

const CommentOptionsSheet = () => {
  const { deleteComment } = useCommentSection();
  const {
    commentOptionsSheetRef,
    setOptionsComment,
    closeCommentOptionsSheet,
    openReportCommentSheet,
    setReportedComment,
    optionsComment,
  } = useSheetManager();

  const { user } = useUser();
  const isOwner = optionsComment && optionsComment.userId === user?.id;
  const snapPoints = useMemo(() => ["100%"], []);

  const handleDeleteComment = () => {
    Alert.alert(
      "Delete comment", // Title
      "Are you sure you want to proceed?", // Message
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            closeCommentOptionsSheet?.();
          },
        },
        {
          text: "OK",
          onPress: () => {
            deleteComment?.({ commentId: optionsComment!.id });
            closeCommentOptionsSheet?.();
          },
        },
      ],
      { cancelable: false } // Prevents closing the alert by tapping outside
    );
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={commentOptionsSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={(state) => {
        if (state === -1) {
          setOptionsComment?.(null);
        }
      }}
      backgroundStyle={{ backgroundColor: "#18181B" }}
      handleIndicatorStyle={{ backgroundColor: "#fff" }}
      handleComponent={() => (
        <View
          style={{
            paddingHorizontal: 32,
            paddingVertical: 16,
            flexDirection: "row",
            borderBottomWidth: 1,
            borderColor: "#3f3f46",
          }}
        >
          <Text
            style={{
              textTransform: "uppercase",
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            comment options
          </Text>
        </View>
      )}
    >
      <BottomSheetView
        style={{
          padding: 16,
        }}
      >
        {isOwner ? (
          <Pressable
            onPress={handleDeleteComment}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16, // Use "rowGap" if supported; fallback otherwise
              padding: 12,
            }}
          >
            <TrashIcon size={20} color="#dc2626" />
            <Text
              style={{
                fontSize: 16,
                flex: 1,
                color: "#dc2626",
              }}
            >
              Delete
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              closeCommentOptionsSheet?.();
              openReportCommentSheet?.();
              setReportedComment?.(optionsComment!);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16, // Use "rowGap" if supported; fallback otherwise
              padding: 12,
            }}
          >
            <FlagIcon size={20} color="#9ca3af" />
            <Text
              style={{
                fontSize: 16,
                flex: 1,
                color: "#9ca3af",
              }}
            >
              Report
            </Text>
          </Pressable>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

export default CommentOptionsSheet;
