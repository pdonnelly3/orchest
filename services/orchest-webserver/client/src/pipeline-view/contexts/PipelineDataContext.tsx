import { useAppContext } from "@/contexts/AppContext";
import { useProjectsContext } from "@/contexts/ProjectsContext";
import { SetStateAction } from "@/hooks/useAsync";
import { useCustomRoute } from "@/hooks/useCustomRoute";
import { useEnsureValidPipeline } from "@/hooks/useEnsureValidPipeline";
import { useFetchEnvironments } from "@/hooks/useFetchEnvironments";
import { useFetchPipelineJson } from "@/hooks/useFetchPipelineJson";
import { siteMap } from "@/routingConfig";
import { Environment, PipelineJson, StepsDict } from "@/types";
import { validatePipeline } from "@/utils/webserver-utils";
import { hasValue, uuidv4 } from "@orchest/lib-utils";
import React from "react";
import { extractStepsFromPipelineJson, updatePipelineJson } from "../common";
import { useFetchInteractiveRun } from "../hooks/useFetchInteractiveRun";
import { useIsReadOnly } from "../hooks/useIsReadOnly";
import { usePipelineRefs } from "./PipelineRefsContext";

export type PipelineDataContextType = {
  disabled: boolean;
  projectUuid?: string;
  pipelineUuid?: string;
  pipelineCwd?: string;
  environments: Environment[];
  runUuid?: string;
  jobUuid?: string;
  setRunUuid: React.Dispatch<React.SetStateAction<string | undefined>>;
  isReadOnly: boolean;
  pipelineJson?: PipelineJson;
  setPipelineJson: (
    value: SetStateAction<PipelineJson>,
    flushPage?: boolean
  ) => void;
  isFetchingPipelineJson: boolean;
  isJobRun: boolean;
  steps: StepsDict;
  setSteps: React.Dispatch<React.SetStateAction<StepsDict>>;
};

export const PipelineDataContext = React.createContext<PipelineDataContextType>(
  {} as PipelineDataContextType
);

export const usePipelineDataContext = () =>
  React.useContext(PipelineDataContext);

export const PipelineDataContextProvider: React.FC = ({ children }) => {
  const { setAlert } = useAppContext();
  useEnsureValidPipeline();

  const {
    pipelineUuid: pipelineUuidFromRoute,
    jobUuid,
    runUuid: runUuidFromRoute,
    navigateTo,
  } = useCustomRoute();

  const { zIndexMax } = usePipelineRefs();

  const {
    state: { pipeline, pipelines, projectUuid },
  } = useProjectsContext();

  // No pipeline found. Editor is frozen and shows "Pipeline not found".
  const disabled = hasValue(pipelines) && pipelines.length === 0;

  const pipelineCwd = pipeline?.path.replace(/\/?[^\/]*.orchest$/, "/");

  // Because `useEnsureValidPipeline` will auto-redirect if pipelineUuidFromRoute is invalid,
  // `pipelineUuid` is only valid until `pipeline?.uuid === pipelineUuidFromRoute`,
  // During the transition, it shouldn't fetch pipelineJson.
  const pipelineUuid =
    pipeline?.uuid === pipelineUuidFromRoute ? pipeline?.uuid : undefined;

  const { runUuid, setRunUuid } = useFetchInteractiveRun(
    projectUuid,
    pipelineUuid,
    runUuidFromRoute
  );

  const isReadOnly = useIsReadOnly(projectUuid, jobUuid, runUuid);

  const {
    pipelineJson,
    setPipelineJson: originalSetPipelineJson,
    isFetchingPipelineJson,
    error,
  } = useFetchPipelineJson({
    // This `projectUuid` cannot be from route. It has to be from ProjectsContext, aligned with `pipeline?.uuid`.
    // Otherwise, when user switch to another project, pipeline?.uuid does not exist.
    projectUuid,
    pipelineUuid,
    jobUuid,
    runUuid,
  });

  const setPipelineJson = React.useCallback(
    (data: SetStateAction<PipelineJson>, flushPage?: boolean) => {
      // in case you want to re-initialize all components according to the new PipelineJson
      // to be part of the re-initialization, you need to assign hash.current as part of the key of your component
      originalSetPipelineJson((current) => {
        if (isReadOnly) {
          console.error("savePipeline should be un-callable in readOnly mode.");
          return current;
        }
        const newData = data instanceof Function ? data(current) : data;

        // validate pipelineJSON
        const pipelineValidation = validatePipeline(newData);

        if (!pipelineValidation.valid) {
          // Just show the first error
          setAlert("Error", pipelineValidation.errors[0]);
          return current;
        }

        if (flushPage && newData) newData.hash = uuidv4();
        return newData;
      });
    },
    [originalSetPipelineJson]
  );

  const [steps, setStepsDispatcher] = React.useState<StepsDict>({});

  const setSteps = React.useCallback(
    (value: React.SetStateAction<StepsDict>) => {
      setStepsDispatcher((current) => {
        const updatedSteps = value instanceof Function ? value(current) : value;
        setPipelineJson(
          (current) => updatePipelineJson(current, updatedSteps),
          true
        );
        return updatedSteps;
      });
    },
    []
  );

  React.useEffect(() => {
    // `hash` is added from the first re-render.
    if (pipelineJson && !Boolean(pipelineJson.hash)) {
      const initialSteps = extractStepsFromPipelineJson(pipelineJson);
      setStepsDispatcher(initialSteps);
      zIndexMax.current = Object.keys(initialSteps).length;
    }
  }, [pipelineJson]);

  React.useEffect(() => {
    // This case is hit when a user tries to load a pipeline that belongs
    // to a run that has not started yet. The project files are only
    // copied when the run starts. Before start, the pipeline.json thus
    // cannot be found. Alert the user about missing pipeline and return
    // to JobView.
    if (error)
      setAlert(
        "Error",
        jobUuid
          ? "The .orchest pipeline file could not be found. This pipeline run has not been started. Returning to Job view."
          : "Could not load pipeline",
        (resolve) => {
          resolve(true);
          if (jobUuid) {
            navigateTo(siteMap.job.path, { query: { projectUuid, jobUuid } });
          } else {
            navigateTo(siteMap.pipeline.path, { query: { projectUuid } });
          }

          return true;
        }
      );
  }, [error, setAlert, navigateTo, projectUuid, jobUuid]);

  const { environments = [] } = useFetchEnvironments(
    !isReadOnly ? projectUuid : undefined
  );

  const isJobRun = hasValue(jobUuid) && hasValue(runUuidFromRoute);

  return (
    <PipelineDataContext.Provider
      value={{
        disabled,
        projectUuid,
        pipelineUuid,
        pipelineCwd,
        environments,
        jobUuid,
        runUuid,
        setRunUuid,
        isReadOnly,
        pipelineJson,
        setPipelineJson,
        isFetchingPipelineJson,
        steps,
        setSteps,
        isJobRun,
      }}
    >
      {children}
    </PipelineDataContext.Provider>
  );
};
