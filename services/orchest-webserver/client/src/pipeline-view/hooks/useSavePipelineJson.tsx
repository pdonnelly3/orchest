import { useHasChanged } from "@/hooks/useHasChanged";
import type { PipelineJson } from "@/types";
import { resolve } from "@/utils/resolve";
import { fetcher } from "@orchest/lib-utils";
import React from "react";
import { usePipelineDataContext } from "../contexts/PipelineDataContext";
import { useSavingIndicator } from "./useSavingIndicator";

export const useSavePipelineJson = () => {
  const {
    projectUuid,
    isReadOnly,
    pipelineUuid,
    pipelineJson,
  } = usePipelineDataContext();

  const setOngoingSaves = useSavingIndicator();
  const savePipelineJson = React.useCallback(
    async (data: PipelineJson) => {
      if (!data || isReadOnly) return;
      setOngoingSaves((current) => current + 1);

      const formData = new FormData();
      const { hash, ...payload } = data;
      formData.append("pipeline_json", JSON.stringify(payload));
      const response = await resolve(() =>
        fetcher(`/async/pipelines/json/${projectUuid}/${pipelineUuid}`, {
          method: "POST",
          body: formData,
        })
      );

      if (response.status === "rejected") {
        // currently step details doesn't do form field validation properly
        // don't apply setAlert here before the form validation is implemented
        console.error(`Failed to save pipeline. ${response.error.message}`);
      }

      setOngoingSaves((current) => current - 1);
    },
    [isReadOnly, projectUuid, pipelineUuid, setOngoingSaves]
  );

  // If has is defined and changed, auto-save.
  const shouldSave = useHasChanged(
    pipelineJson?.hash,
    (prev, curr) => Boolean(prev) && prev !== curr
  );

  React.useEffect(() => {
    if (shouldSave && pipelineJson) {
      savePipelineJson(pipelineJson);
    }
  }, [shouldSave, pipelineJson, savePipelineJson]);
};
