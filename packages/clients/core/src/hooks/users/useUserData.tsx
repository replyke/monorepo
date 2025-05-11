import { useCallback } from "react";
import { AuthUser } from "../../interfaces/models/User";
import useUpdateUser, { UpdateUserParams } from "./useUpdateUser";
import { handleError } from "../../utils/handleError";

export interface UseUserDataProps {
  user: AuthUser | null;
  setUser: (newUser: AuthUser) => void;
}

export interface UseUserDataValues {
  user?: AuthUser | null;
  updateUser: (update: UpdateUserParams) => Promise<void>;
}

function useUserData({ user, setUser }: UseUserDataProps): UseUserDataValues {
  const updateUser = useUpdateUser();

  const handleUpdateUser = useCallback(
    async (update: UpdateUserParams) => {
      if (!user) return;
      try {
        const newUser = await updateUser({ userId: user.id, update });
        if (newUser) setUser?.(newUser);
      } catch (err) {
        handleError(err, "Updating user failed");
      }
    },
    [user, updateUser, setUser]
  );
  return { user, updateUser: handleUpdateUser };
}

export default useUserData;
