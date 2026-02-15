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
          className={`px-8 py-4 flex-row border-b ${
            theme === 'dark' ? 'border-gray-600' : 'border-zinc-700'
          }`}
        >
          <Text
            className={`uppercase text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            comment options
          </Text>
        </View>
      )}
    >
      <BottomSheetView className="p-4">
        <Pressable
          onPress={handleDeleteComment}
          className="flex-row items-center gap-4 p-3"
        >
          <TrashIcon
            size={20}
            color={theme === 'dark' ? '#F87171' : '#dc2626'}
          />
          <Text
            className={`text-base flex-1 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-600'
            }`}
          >
            Delete
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default CommentOptionsSheetOwner;
