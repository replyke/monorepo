import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

function Skeleton({ style }: { style?: any }) {
  // Mirrors the react-js sibling's CSS `pulse 1.5s ease-in-out infinite`
  // (opacity 1 -> 0.3 -> 1). A bare `new Animated.Value(...)` in the style
  // prop is inert — nothing drives it — so the "pulse" used to be a static
  // opacity that also allocated a fresh Animated.Value on every render.
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      // Without this the loop keeps running against an unmounted view.
      animation.stop();
      opacity.setValue(1);
    };
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
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
