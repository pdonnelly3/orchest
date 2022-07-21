import { useForceUpdate } from "@/hooks/useForceUpdate";
import React from "react";
import {
  PipelineUiState,
  PipelineUiStateAction,
  usePipelineUiState,
} from "../hooks/usePipelineUiState";
import { useRenderConnections } from "../hooks/useRenderConnections";
import { usePipelineDataContext } from "./PipelineDataContext";
import { usePipelineRefs } from "./PipelineRefsContext";

export type PipelineUiStateContextType = {
  uiState: PipelineUiState;
  uiStateDispatch: React.Dispatch<PipelineUiStateAction>;
  instantiateConnection: (
    startNodeUUID: string,
    endNodeUUID?: string | undefined
  ) => {
    startNodeUUID: string;
    endNodeUUID: string | undefined;
  };
};

export const PipelineUiStateContext = React.createContext<
  PipelineUiStateContextType
>({} as PipelineUiStateContextType);

export const usePipelineUiStateContext = () =>
  React.useContext(PipelineUiStateContext);

export const PipelineUiStateContextProvider: React.FC = ({ children }) => {
  const { stepRefs } = usePipelineRefs();
  const { uiState, uiStateDispatch } = usePipelineUiState();
  const { connections } = uiState;
  const {
    isReadOnly,
    setPipelineJson,
    steps,
    setSteps,
  } = usePipelineDataContext();

  useRenderConnections(uiStateDispatch);

  const instantiateConnection = React.useCallback(
    (startNodeUUID: string, endNodeUUID?: string | undefined) => {
      const connection = { startNodeUUID, endNodeUUID };

      uiStateDispatch({
        type: "INSTANTIATE_CONNECTION",
        payload: connection,
      });

      return connection;
    },
    [uiStateDispatch]
  );

  // in read-only mode, PipelineEditor doesn't re-render after stepRefs collects all DOM elements of the steps
  // we need to force re-render one more time to show the connection lines
  const shouldForceRerender =
    isReadOnly &&
    connections.length > 0 &&
    Object.keys(stepRefs.current).length === 0;

  const [, forceUpdate] = useForceUpdate();

  React.useLayoutEffect(() => {
    if (shouldForceRerender) forceUpdate();
  }, [shouldForceRerender, forceUpdate]);

  return (
    <PipelineUiStateContext.Provider
      value={{
        uiState,
        uiStateDispatch,
        instantiateConnection,
      }}
    >
      {children}
    </PipelineUiStateContext.Provider>
  );
};
