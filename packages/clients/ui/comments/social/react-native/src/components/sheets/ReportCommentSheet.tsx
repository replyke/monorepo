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
import useSheetManager from "../../hooks/useSheetManager";

const ReportCommentSheet = () => {
  const { user } = useUser();
  const { callbacks } = useCommentSection();
  const {
    reportCommentSheetRef,
    reportedComment,
    setReportedComment,
    closeReportCommentSheet,
  } = useSheetManager();
  const { createCommentReport } = useCreateReport();

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
      handleError(err, "Submtting report failed");
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
      backgroundStyle={{ backgroundColor: "#18181B" }}
      handleIndicatorStyle={{ backgroundColor: "#fff" }}
    >
      <BottomSheetView
        style={{
          padding: 28,
          flex: 1,
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <FlagIcon size={24} color="#e5e7eb" />
            <Text style={{ fontSize: 24, color: "#e5e7eb" }}>
              Submit a report
            </Text>
          </View>
          <Text
            style={{
              color: "#e5e7eb",
              marginTop: 24,
            }}
          >
            Thank you for looking out for our community. Let us know what is
            happening, and we'll look into it.
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 24,
            }}
          >
            {Object.entries(reportReasons).map(([key, value], index) => (
              <Pressable
                onPress={() => setReason(key as ReportReasonKey)}
                key={index}
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: key === reason ? "#f9fafb" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: key === reason ? "#1f2937" : "#e5e7eb",
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
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
