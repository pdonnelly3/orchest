import { StepsDict } from "@/types";
import React from "react";
import { usePipelineDataContext } from "../contexts/PipelineDataContext";
import { usePipelineRefs } from "../contexts/PipelineRefsContext";
import { PipelineUiStateAction } from "./usePipelineUiState";

export const useInitializePipelineEditor = (
  uiStateDispatch: React.Dispatch<PipelineUiStateAction>
) => {
  const { zIndexMax } = usePipelineRefs();
  const { pipelineJson, steps } = usePipelineDataContext();

  const initializeUiState = React.useCallback(
    (initialSteps: StepsDict) => {
      const connections = Object.values(initialSteps).flatMap((step) => {
        const connections = step.incoming_connections.map((startNodeUUID) => {
          return { startNodeUUID, endNodeUUID: step.uuid };
        });
        zIndexMax.current += connections.length;
        return connections;
      });

      uiStateDispatch({
        type: "INSTANTIATE_CONNECTIONS",
        payload: connections,
      });
    },
    [uiStateDispatch, zIndexMax]
  );

  React.useEffect(() => {
    // `hash` is added at the first re-render.
    if (pipelineJson && !Boolean(pipelineJson.hash) && steps) {
      initializeUiState(steps);
    }
  }, [initializeUiState, pipelineJson]);
};
