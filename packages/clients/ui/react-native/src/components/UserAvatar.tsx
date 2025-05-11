import { View, Image, StyleSheet } from "react-native";

interface UserProps {
  id?: string;
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  username?: string | null | undefined;
}
const UserAvatar = ({
  user,
  size = 32,
  borderRadius,
}: {
  user: UserProps | null | undefined;
  size?: number | undefined;
  borderRadius?: number | undefined;
}) => {
  if (!user) return null;

  const userImg = user.avatar
    ? user.avatar
    : `https://api.dicebear.com/9.x/thumbs/png?seed=${user.id}`;

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: borderRadius || size / 2,
        },
      ]}
    >
      <Image
        source={{
          uri: userImg,
        }}
        style={[
          styles.image,
          {
            borderRadius: borderRadius || size / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});

export default UserAvatar;
