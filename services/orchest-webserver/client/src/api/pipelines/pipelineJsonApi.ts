import { PipelineJson } from "@/types";
import { queryArgs } from "@/utils/text";
import { setOutgoingConnections } from "@/utils/webserver-utils";
import { fetcher, hasValue } from "@orchest/lib-utils";

type PipelineJsonResponse = {
  pipeline_json: string;
  success: boolean;
};

export const transformResponse = async (
  response: PipelineJsonResponse
): Promise<PipelineJson> => {
  if (!response.success) {
    return Promise.reject("Failed to fetch pipeline.json");
  }

  const pipelineObj = JSON.parse(response.pipeline_json) as PipelineJson;

  // as settings are optional, populate defaults if no values exist
  if (pipelineObj.settings === undefined) {
    pipelineObj.settings = {};
  }
  if (pipelineObj.settings.auto_eviction === undefined) {
    pipelineObj.settings.auto_eviction = false;
  }
  if (pipelineObj.settings.data_passing_memory_size === undefined) {
    pipelineObj.settings.data_passing_memory_size = "1GB";
  }
  if (pipelineObj.parameters === undefined) {
    pipelineObj.parameters = {};
  }
  if (pipelineObj.services === undefined) {
    pipelineObj.services = {};
  }

  // Previously `order` was managed via localstorage, meaning that `order` could be incorrect.
  // Currently, `order` has become mandatory, which should be guaranteed by BE.
  // To prevent user provides a JSON file with services with wrong order value,
  // we keep the precautions here, and ensure that FE uses and saves the right data.

  const sortedServices = Object.entries(pipelineObj.services).sort((a, b) => {
    if (!hasValue(a[1].order) && !hasValue(b[1].order))
      return a[1].name.localeCompare(b[1].name); // If both services have no order value, sort them by name.
    if (!hasValue(a[1].order)) return -1; // move all undefined item to the tail.
    if (!hasValue(b[1].order)) return 1;
    return a[1].order - b[1].order;
  });
  // Ensure that order value is unique, and assign a valid value to `order` if it's undefined
  let maxOrder = -1;
  for (let sorted of sortedServices) {
    const targetServiceOrder = pipelineObj.services[sorted[0]].order;
    if (hasValue(targetServiceOrder)) {
      const orderValue =
        maxOrder === targetServiceOrder // Order value is duplicated.
          ? targetServiceOrder + 1
          : targetServiceOrder;
      pipelineObj.services[sorted[0]].order = orderValue;
      maxOrder = orderValue;
      continue;
    }

    pipelineObj.services[sorted[0]].order = maxOrder + 1;
    maxOrder += 1;
  }

  pipelineObj.steps = setOutgoingConnections(pipelineObj.steps);

  return pipelineObj;
};

const fetch = async (
  projectUuid: string,
  pipelineUuid: string,
  jobUuid?: string,
  pipelineRunUuid?: string
): Promise<PipelineJson> => {
  const queryString =
    jobUuid && pipelineRunUuid
      ? `?${queryArgs({ jobUuid, pipelineRunUuid })}`
      : "";
  return fetcher<PipelineJsonResponse>(
    `/async/pipelines/json/${projectUuid}/${pipelineUuid}${queryString}`
  ).then(transformResponse);
};

const put = (projectUuid: string, pipelineUuid: string, data: PipelineJson) => {
  const formData = new FormData();
  formData.append("pipeline_json", JSON.stringify(data));

  return fetcher<{ success: boolean; reason?: string; message?: string }>(
    `/async/pipelines/json/${projectUuid}/${pipelineUuid}`,
    { method: "PUT", body: formData }
  );
};

export const pipelineJsonApi = {
  fetch,
  put,
};
