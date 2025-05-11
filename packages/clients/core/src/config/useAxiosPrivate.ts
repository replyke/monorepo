"use client";

import { useEffect } from "react";
import { axiosPrivate } from "./axios";
import useAuth from "../hooks/auth/useAuth";

const useAxiosPrivate = () => {
  const { accessToken, requestNewAccessToken } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        // If we have no value for access token return the config as is
        // This is a new addition so maybe let's avoid it for not until eveything works fine.
        // if (!accessToken) return config;

        // If we already have Auth headers set then just return the config
        if (config.headers["Authorization"]) return config;

        // Otherwise we set the authorization headers
        config.headers["Authorization"] = `Bearer ${accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        if (error?.response?.status === 403 && !prevRequest?.sent) {
          prevRequest.sent = true;
          const newAccessToken = await requestNewAccessToken?.();
          prevRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return axiosPrivate(prevRequest);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [accessToken, requestNewAccessToken]);

  return axiosPrivate;
};

export default useAxiosPrivate;
