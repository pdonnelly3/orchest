import { useAppContext } from "@/contexts/AppContext";
import { fetcher } from "@orchest/lib-utils";
import React from "react";
import useSWR from "swr";

export const useFetchVersion = () => {
  const { setAlert } = useAppContext();

  const { data, error, isValidating } = useSWR<{ version: string }>(
    "/async/version",
    fetcher
  );

  React.useEffect(() => {
    if (error)
      setAlert("Error", `Failed to fetch Orchest version. ${error.message}`);
  }, [error, setAlert]);

  return {
    version: data?.version,
    fetchVersionError: error,
    isFetchingVersion: isValidating,
  };
};
