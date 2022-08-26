import { useJobsApi } from "@/api/jobs/useJobsApi";
import { useCustomRoute } from "@/hooks/useCustomRoute";
import { siteMap } from "@/routingConfig";
import React from "react";
import { pickJobChanges } from "../common";
import { useEditJob } from "../stores/useEditJob";

/**
 * Performs a side effect that ensures that the stores load the right job
 * with the given pipeline_uuid and job_uuid in the query args.
 */
export const useSyncJobUuidWithQueryArgs = () => {
  const {
    projectUuid,
    jobUuid: jobUuidFromRoute,
    navigateTo,
  } = useCustomRoute();

  const uuid = useEditJob((state) => state.jobChanges?.uuid);
  const initJobChanges = useEditJob((state) => state.initJobChanges);
  const jobs = useJobsApi((state) => state.jobs);

  const targetJob = React.useMemo(() => {
    const foundJob =
      jobs?.find((job) => job.uuid === jobUuidFromRoute) || jobs?.[0];

    return foundJob;
  }, [jobs, jobUuidFromRoute]);

  const redirect = React.useCallback(
    (jobUuid: string) => {
      navigateTo(siteMap.jobs.path, {
        query: { projectUuid, jobUuid },
      });
    },
    [navigateTo, projectUuid]
  );

  const isJobUuidFromRouteInvalid =
    targetJob && targetJob.uuid !== jobUuidFromRoute;

  const shouldUpdateJobChanges = targetJob && uuid !== targetJob.uuid;

  React.useEffect(() => {
    if (isJobUuidFromRouteInvalid) {
      redirect(targetJob.uuid);
    } else if (shouldUpdateJobChanges) {
      initJobChanges(pickJobChanges(targetJob));
    }
  }, [
    isJobUuidFromRouteInvalid,
    redirect,
    targetJob,
    shouldUpdateJobChanges,
    initJobChanges,
  ]);
};
