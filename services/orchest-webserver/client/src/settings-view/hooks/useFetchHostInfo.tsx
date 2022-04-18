import { useAppContext } from "@/contexts/AppContext";
import { fetcher } from "@orchest/lib-utils";
import React from "react";
import useSWR from "swr";

type HostInfo = {
  disk_info: {
    used_GB: number;
    avail_GB: number;
    used_pcent: number;
  };
};

export const useFetchHostInfo = () => {
  const { setAlert } = useAppContext();

  const { data, error, isValidating } = useSWR<HostInfo>(
    "/async/host-info",
    fetcher
  );

  React.useEffect(() => {
    if (error)
      setAlert("Error", `Failed to fetch Host information. ${error.message}`);
  }, [error, setAlert]);

  return {
    hostInfo: data,
    fetchHostInfoError: error,
    isFetchingHostInfo: isValidating,
  };
};
