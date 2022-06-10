import { useAppContext } from "@/contexts/AppContext";
import { Strategy, StrategyJson } from "@/types";
import {
  Alert,
  AlertDescription,
  AlertHeader,
  IconLightBulbOutline,
  Link,
} from "@orchest/design-system";
import classNames from "classnames";
import isString from "lodash.isstring";
import React from "react";

export interface IParamTreeProps {
  pipelineName: string;
  editParameter?: (parameterKey: string, key: string) => void;
  strategyJSON: StrategyJson;
  activeParameter:
    | {
        key: string;
        strategyJSONKey: string;
      }
    | undefined;
}

export const NoParameterAlert = () => {
  return (
    <Alert status="info">
      <AlertHeader>
        <IconLightBulbOutline />
        {`This pipeline doesn't have any parameters defined`}
      </AlertHeader>
      <AlertDescription>
        <>
          <Link
            target="_blank"
            href="https://docs.orchest.io/en/stable/fundamentals/jobs.html#parametrizing-pipelines-and-steps"
          >
            Learn more
          </Link>{" "}
          about parametrizing your pipelines and steps.
        </>
      </AlertDescription>
    </Alert>
  );
};

const truncateParameterValue = (value: string | unknown, maxLength = 50) => {
  const stringifiedValue = !isString(value) ? JSON.stringify(value) : value;

  return stringifiedValue.length > maxLength
    ? stringifiedValue.substring(0, maxLength - 1) + "…"
    : stringifiedValue;
};

const Parameters = ({
  activeParameter,
  editParameter,
  stepStrategy,
  includeTitle = true,
  ...props
}: {
  activeParameter:
    | {
        key: string;
        strategyJSONKey: string;
      }
    | undefined;
  editParameter?: (parameterKey: string, key: string) => void;
  stepStrategy: Strategy;
  includeTitle?: boolean;
  "data-test-id": string;
}) => {
  const title =
    includeTitle && stepStrategy.title && stepStrategy.title.length > 0
      ? stepStrategy.title
      : undefined;

  return (
    <>
      {title && <b key={stepStrategy.key}>{title}</b>}
      {Object.entries(stepStrategy.parameters).map(([parameterKey, value]) => {
        const isActive =
          activeParameter?.key === parameterKey &&
          activeParameter?.strategyJSONKey == stepStrategy.key;
        return (
          <div
            key={`${parameterKey}-${stepStrategy.key}`}
            className="parameter-row"
            data-test-id={
              props["data-test-id"] + `-parameter-row-${parameterKey}`
            }
          >
            <div className="parameter-key">{parameterKey}:</div>
            <div
              className={classNames(
                "parameter-value",
                editParameter ? "editable" : undefined
              )}
              onClick={() => editParameter?.(parameterKey, stepStrategy.key)}
              data-test-id={`${props["data-test-id"]}-parameter-row-${parameterKey}-value`}
            >
              <span
                style={{
                  fontWeight: isActive ? "bold" : "normal",
                }}
              >
                {truncateParameterValue(value)}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};

const ParamTree: React.FC<IParamTreeProps> = (props) => {
  const { config } = useAppContext();
  const { editParameter, activeParameter, strategyJSON } = props;

  let pipelineParameters =
    strategyJSON[config?.PIPELINE_PARAMETERS_RESERVED_KEY || ""];

  const stepStrategies = Object.entries(strategyJSON)
    .filter(
      ([stepUuid]) => stepUuid !== config?.PIPELINE_PARAMETERS_RESERVED_KEY
    )
    .map(([, stepStrategy]) => stepStrategy);

  return (
    <div className="parameter-tree">
      {Object.keys(props.strategyJSON).length == 0 && <NoParameterAlert />}

      {pipelineParameters && (
        <div className="param-block">
          <h3>Pipeline: {props.pipelineName}</h3>
          <Parameters
            editParameter={editParameter}
            activeParameter={activeParameter}
            stepStrategy={pipelineParameters}
            data-test-id={props["data-test-id"]}
          />
        </div>
      )}

      {stepStrategies.length > 0 && (
        <div className="param-block">
          <h3>Steps</h3>
          <div className="step-params">
            {stepStrategies.map((stepStrategy) => {
              return (
                <Parameters
                  key={stepStrategy?.key}
                  editParameter={editParameter}
                  activeParameter={activeParameter}
                  stepStrategy={stepStrategy}
                  data-test-id={props["data-test-id"]}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParamTree;
