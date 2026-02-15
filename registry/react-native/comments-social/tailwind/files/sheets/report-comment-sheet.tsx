import { View, Text, Pressable } from "react-native";
import { useCallback, useMemo, useState } from "react";
import {
  handleError,
  ReportReasonKey,
  reportReasons,
  useUser,
  useCommentSection,
  useCreateReport,
} from "@replyke/core";
import { FlagIcon, CustomButton } from "@replyke/ui-core-react-native";

import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import useUIState from "../../hooks/use-ui-state";

const ReportCommentSheet = () => {
  const { user } = useUser();
  const { callbacks } = useCommentSection();
  const {
    reportCommentSheetRef,
    reportedComment,
    setReportedComment,
    closeReportCommentSheet,
    theme,
  } = useUIState();
  const createCommentReport = useCreateReport({ type: "comment" });

  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState<ReportReasonKey | null>(null);
  const snapPoints = useMemo(() => ["100%"], []);

  const buttonActive = useMemo(
    () => !!reason && !!reportedComment,
    [reason, reportedComment]
  );

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

  const handleSubmitReport = async () => {
    try {
      if (!reportedComment) throw new Error("No comment to report selected");
      if (!reason) throw new Error("No reason to report selected");
      if (!user) {
        callbacks?.loginRequiredCallback?.();
        return;
      }
      setSubmitting(true);
      await createCommentReport({ targetId: reportedComment.id, reason });
      closeReportCommentSheet?.();
      setReportedComment?.(null);
      setReason(null);
    } catch (err) {
      handleError(err, "Submitting report failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={reportCommentSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={(state) => {
        if (state === -1) {
          setReportedComment?.(null);
        }
      }}
      backgroundStyle={{
        backgroundColor: theme === 'dark' ? '#1F2937' : '#18181B',
      }}
      handleIndicatorStyle={{
        backgroundColor: theme === 'dark' ? '#F9FAFB' : '#fff',
      }}
    >
      <BottomSheetView className="p-7 flex-1 h-full justify-between">
        <View>
          <View className="flex-row items-center gap-4">
            <FlagIcon
              size={24}
              color={theme === 'dark' ? '#F9FAFB' : '#e5e7eb'}
            />
            <Text
              className={`text-2xl ${
                theme === 'dark' ? 'text-gray-50' : 'text-gray-200'
              }`}
            >
              Submit a report
            </Text>
          </View>
          <Text
            className={`mt-6 ${
              theme === 'dark' ? 'text-gray-50' : 'text-gray-200'
            }`}
          >
            Thank you for looking out for our community. Let us know what is
            happening, and we'll look into it.
          </Text>

          <View className="flex-row flex-wrap gap-3 mt-6">
            {Object.entries(reportReasons).map(([key, value], index) => {
              const isSelected = key === reason;
              return (
                <Pressable
                  onPress={() => setReason(key as ReportReasonKey)}
                  key={index}
                  className={`border px-4 py-2.5 rounded-xl ${
                    theme === 'dark'
                      ? 'border-gray-600'
                      : 'border-gray-200'
                  } ${
                    isSelected
                      ? theme === 'dark'
                        ? 'bg-gray-700'
                        : 'bg-gray-50'
                      : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={
                      isSelected
                        ? theme === 'dark'
                          ? 'text-gray-50'
                          : 'text-gray-800'
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-200'
                    }
                  >
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <CustomButton
          text="Submit Report"
          activeText="Submitting.."
          onPress={handleSubmitReport}
          disabled={!buttonActive}
          submitting={submitting}
        />
      </BottomSheetView>
    </BottomSheet>
  );
};

export default ReportCommentSheet;
