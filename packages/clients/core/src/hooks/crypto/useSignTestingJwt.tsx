import axios from "axios";
import { handleError } from "../../utils/handleError";

function useSignTestingJwt() {
  const signTestingJwt = async ({
    projectId,
    privateKey,
    payload,
  }: {
    projectId: string;
    privateKey: string;
    payload: Record<string, any>;
  }) => {
    try {
      // Warn developers about the security risks
      console.warn(`
    WARNING: You are using a testing function to generate JWTs in your client application.
    This is NOT secure and should ONLY be used for initial development and testing purposes.

    In production:
    - NEVER expose your secret key in client-side code.
    - Refer to the documentation at https://docs.replyke.com to implement JWT signing on your backend.
    - Rotate your secret key periodically, especially after moving from testing to production.

    Failure to follow these practices can lead to security vulnerabilities.
  `);

      const response = await axios.post(
        "https://api.replyke.com/internal/crypto/sign-testing-jwt",
        {
          projectId,
          privateKey,
          payload,
        }
      );

      return response.data as string;
    } catch (err: unknown) {
      handleError(err, "Failed to sign testing jwt: ");
    }
  };

  return signTestingJwt;
}

export default useSignTestingJwt;
