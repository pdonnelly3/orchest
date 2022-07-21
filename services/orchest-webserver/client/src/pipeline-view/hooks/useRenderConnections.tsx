import { StepsDict } from "@/types";
import React from "react";
import { usePipelineDataContext } from "../contexts/PipelineDataContext";
import { PipelineUiStateAction } from "./usePipelineUiState";

export const useRenderConnections = (
  uiStateDispatch: React.Dispatch<PipelineUiStateAction>
) => {
  const { pipelineJson, steps } = usePipelineDataContext();

  const renderConnection = React.useCallback(
    (initialSteps: StepsDict) => {
      const connections = Object.values(initialSteps).flatMap((step) => {
        const connections = step.incoming_connections.map((startNodeUUID) => {
          return { startNodeUUID, endNodeUUID: step.uuid };
        });

        return connections;
      });

      uiStateDispatch({
        type: "INSTANTIATE_CONNECTIONS",
        payload: connections,
      });
    },
    [uiStateDispatch]
  );

  React.useEffect(() => {
    if (steps) {
      renderConnection(steps);
    }
  }, [renderConnection, pipelineJson?.hash, steps]);
};
