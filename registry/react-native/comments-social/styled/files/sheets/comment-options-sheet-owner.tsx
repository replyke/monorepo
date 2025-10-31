import { View, Text, Pressable, Alert } from "react-native";
import { useCallback, useMemo } from "react";
import { useCommentSection } from "@replyke/core";
import { TrashIcon } from "@replyke/ui-core-react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import useUIState from "../../hooks/use-ui-state";

const CommentOptionsSheetOwner = () => {
  const { deleteComment } = useCommentSection();
  const {
    commentOptionsSheetOwnerRef,
    setOptionsComment,
    closeCommentOptionsSheetOwner,
    optionsComment,
    theme,
  } = useUIState();

  const snapPoints = useMemo(() => ["100%"], []);

  const handleDeleteComment = () => {
    Alert.alert(
      "Delete comment",
      "Are you sure you want to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            closeCommentOptionsSheetOwner?.();
          },
        },
        {
          text: "OK",
          onPress: () => {
            deleteComment?.({ commentId: optionsComment!.id });
            closeCommentOptionsSheetOwner?.();
          },
        },
      ],
      { cancelable: false }
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
      ref={commentOptionsSheetOwnerRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={(state) => {
        if (state === -1) {
          setOptionsComment?.(null);
        }
      }}
      backgroundStyle={{
        backgroundColor: theme === 'dark' ? '#1F2937' : '#18181B',
      }}
      handleIndicatorStyle={{
        backgroundColor: theme === 'dark' ? '#F9FAFB' : '#fff',
      }}
      handleComponent={() => (
        <View
          style={{
            paddingHorizontal: 32,
            paddingVertical: 16,
            flexDirection: "row",
            borderBottomWidth: 1,
            borderColor: theme === 'dark' ? '#4B5563' : '#3f3f46',
          }}
        >
          <Text
            style={{
              textTransform: "uppercase",
              color: theme === 'dark' ? '#9CA3AF' : '#6b7280',
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
        <Pressable
          onPress={handleDeleteComment}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            padding: 12,
          }}
        >
          <TrashIcon
            size={20}
            color={theme === 'dark' ? '#F87171' : '#dc2626'}
          />
          <Text
            style={{
              fontSize: 16,
              flex: 1,
              color: theme === 'dark' ? '#F87171' : '#dc2626',
            }}
          >
            Delete
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default CommentOptionsSheetOwner;
