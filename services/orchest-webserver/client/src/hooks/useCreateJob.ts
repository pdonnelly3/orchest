import { useAppContext } from "@/contexts/AppContext";
import { useAsync } from "@/hooks/useAsync";
import { useCustomRoute } from "@/hooks/useCustomRoute";
import { siteMap } from "@/routingConfig";
import { EnvironmentValidationData, Job } from "@/types";
import { checkGate } from "@/utils/webserver-utils";
import { fetcher, HEADER } from "@orchest/lib-utils";
import React from "react";

const sendCreateJobRequest = async (
  projectUuid: string,
  newJobName: string,
  pipelineUuid: string,
  pipelineName: string
) => {
  await checkGate(projectUuid);
  return fetcher<Job>("/catch/api-proxy/api/jobs/", {
    method: "POST",
    headers: HEADER.JSON,
    body: JSON.stringify({
      pipeline_uuid: pipelineUuid,
      project_uuid: projectUuid,
      pipeline_name: pipelineName, // ? Question: why pipeline_name is needed when pipeline_uuid is given?
      name: newJobName,
      draft: true,
      pipeline_run_spec: {
        run_type: "full",
        uuids: [],
      },
      parameters: [],
    }),
  });
};

export const useCreateJob = () => {
  const { setAlert, requestBuild } = useAppContext();
  const { navigateTo, projectUuid } = useCustomRoute();
  const { run, status, error } = useAsync<
    void,
    { reason: string; data: EnvironmentValidationData; message: string }
  >();

  const createJob = React.useCallback(
    async (newJobName: string, pipelineUuid: string, pipelineName: string) => {
      return run(
        sendCreateJobRequest(
          projectUuid,
          newJobName,
          pipelineUuid,
          pipelineName
        )
          .then((job) => {
            navigateTo(siteMap.editJob.path, {
              query: {
                projectUuid,
                jobUuid: job.uuid,
              },
            });
          })
          .catch((error) => {
            if (error.reason === "gate-failed") {
              return new Promise((resolve, reject) => {
                requestBuild(
                  projectUuid,
                  error.data,
                  "CreateJob",
                  async () => {
                    await createJob(newJobName, pipelineUuid, pipelineName);
                    resolve();
                  },
                  () => {
                    reject();
                  }
                );
              });
            }
            // Throw the error if it is unknoen,
            // and let `useAsync` to handle it.
            throw error;
          })
      );
    },
    [run, navigateTo, projectUuid, requestBuild]
  );

  React.useEffect(() => {
    if (error) {
      setAlert("Error", `Failed to create job. ${error.message}`);
    }
  }, [error, setAlert]);

  return { createJob, status, error };
};
