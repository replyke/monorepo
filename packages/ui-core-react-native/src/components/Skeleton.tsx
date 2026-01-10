import { View, StyleSheet, Animated } from "react-native";

function Skeleton({ style }: { style?: any }) {
  return (
    <Animated.View
      style={[styles.skeleton, style, { opacity: new Animated.Value(0.6) }]}
    />
  );
}

function CommentSkeleton() {
  return (
    <View style={styles.commentContainer}>
      <Skeleton style={styles.avatarSkeleton} />
      <View style={styles.textSkeletonContainer}>
        <Skeleton style={{ ...styles.textSkeleton, width: "30%" }} />
        <Skeleton style={styles.textSkeleton} />
        <Skeleton style={{ ...styles.textSkeleton, width: "15%" }} />
      </View>
    </View>
  );
}

function UserMentionSkeleton() {
  return (
    <View style={styles.mentionContainer}>
      <Skeleton style={styles.mentionAvatarSkeleton} />
      <View style={{ flex: 1 }}>
        <Skeleton style={styles.textSkeleton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#efefef",
    borderRadius: 8,
    width: "100%",
    height: 16,
  },
  commentContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
  },
  avatarSkeleton: {
    height: 50,
    width: 50,
    borderRadius: 25,
  },
  textSkeletonContainer: {
    flex: 1,
    gap: 8,
  },
  textSkeleton: {
    width: "100%",
    height: 16,
    borderRadius: 8,
  },
  mentionContainer: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    alignItems: "center",
  },
  mentionAvatarSkeleton: {
    height: 35,
    width: 35,
    borderRadius: 17.5,
  },
});

export { CommentSkeleton, UserMentionSkeleton, Skeleton };
