import { useFetcher } from "@/hooks/useFetcher";
import { PipelineRun } from "@/types";
import { hasValue } from "@orchest/lib-utils";
import React from "react";
import { PIPELINE_RUN_STATUS_ENDPOINT } from "../common";
import { queryArgs } from "../file-manager/common";

export const useFetchInteractiveRun = (
  projectUuid: string | undefined,
  pipelineUuid: string | undefined,
  runUuidFromRoute: string | undefined
) => {
  // Edit mode fetches latest interactive run
  const shouldFetchRunUuid =
    !runUuidFromRoute && hasValue(projectUuid) && hasValue(pipelineUuid);

  const { data: latestRunUuid, error: fetchRunUuidError, status } = useFetcher<
    { runs: PipelineRun[] },
    string | undefined
  >(
    shouldFetchRunUuid
      ? `${PIPELINE_RUN_STATUS_ENDPOINT}?${queryArgs({
          projectUuid,
          pipelineUuid,
        })}`
      : undefined,
    { transform: (data) => data.runs[0]?.uuid }
  );

  const [runUuid, setRunUuid] = React.useState<string | undefined>(
    !shouldFetchRunUuid ? runUuidFromRoute : undefined
  );

  React.useEffect(() => {
    if (!runUuid && latestRunUuid) setRunUuid(latestRunUuid);
  }, [runUuid, latestRunUuid]);

  return {
    runUuid,
    setRunUuid,
    fetchRunUuidError,
    isFetchingRunUuid: status === "PENDING",
  };
};
