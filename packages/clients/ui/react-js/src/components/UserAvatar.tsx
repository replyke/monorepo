import { resetImg } from "../constants/reset-styles";

interface UserProps {
  id?: string;
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  username?: string | null | undefined;
}

function UserAvatar({
  user,
  size = 32,
  borderRadius,
}: {
  user: UserProps | undefined;
  size?: number | undefined;
  borderRadius?: number | undefined;
}) {
  if (!user) return null;
  return (
    <div
      style={{
        overflow: "hidden",
        width: size,
        height: size,
        borderRadius: borderRadius || size,
        borderWidth: 1,
        borderColor: "#E6E6E6",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <img
        src={
          user.avatar ??
          `https://api.dicebear.com/9.x/thumbs/svg?seed=${user.id}`
        }
        alt={user.name || user.id}
        style={{
          ...resetImg,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

export default UserAvatar;
