import { Code } from "@/components/common/Code";
import { PageTitle } from "@/components/common/PageTitle";
import { Layout } from "@/components/Layout";
import { useAppContext } from "@/contexts/AppContext";
import { useCheckUpdate } from "@/hooks/useCheckUpdate";
import { useCustomRoute } from "@/hooks/useCustomRoute";
import { useSendAnalyticEvent } from "@/hooks/useSendAnalyticEvent";
import { siteMap } from "@/Routes";
import StyledButtonOutlined from "@/styled-components/StyledButton";
import PeopleIcon from "@mui/icons-material/People";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SaveIcon from "@mui/icons-material/Save";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import TuneIcon from "@mui/icons-material/Tune";
import { Typography } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import { checkHeartbeat, fetcher, hasValue } from "@orchest/lib-utils";
import "codemirror/mode/javascript/javascript";
import React from "react";
import { Controlled as CodeMirror } from "react-codemirror2";
import { useFetchHostInfo } from "./hooks/useFetchHostInfo";
import { useFetchVersion } from "./hooks/useFetchVersion";
import { UserConfigJson, useUserConfig } from "./hooks/useUserConfig";

const SettingsView: React.FC = () => {
  const { navigateTo } = useCustomRoute();
  const {
    setAlert,
    setAsSaved,
    setConfirm,
    state: { config, hasUnsavedChanges },
  } = useAppContext();

  useSendAnalyticEvent("view load", { name: siteMap.settings.path });

  const [status, setStatus] = React.useState<
    "restarting" | "online" | "offline" | "..."
  >("...");

  const { version } = useFetchVersion();
  const { hostInfo } = useFetchHostInfo();
  const {
    configJson,
    setConfigJson,
    userConfig,
    setUserConfig,
  } = useUserConfig();

  const [requiresRestart, setRequireRestart] = React.useState<string[]>([]);

  const generateUnmodifiableConfig = (configJSON: UserConfigJson) => {
    if (config?.CLOUD !== true) {
      return {};
    }

    // Pick unmodifiable properties by key
    return (config?.CLOUD_UNMODIFIABLE_CONFIG_VALUES || []).reduce(
      (all, key) => {
        if (configJSON[key]) return { ...all, [key]: configJSON[key] };
        return all;
      },
      {} as UserConfigJson
    );
  };

  const saveConfig = async (configToSave: string) => {
    let formData = new FormData();

    try {
      let changedConfig = JSON.parse(configToSave);
      let unmodifiableConfig = configJson
        ? generateUnmodifiableConfig(configJson)
        : null;
      let joinedConfig = { ...unmodifiableConfig, ...changedConfig };

      formData.append("config", JSON.stringify(joinedConfig));

      const responseJSON = await fetcher<{
        requires_restart: string[];
        user_config: UserConfigJson;
      }>("/async/user-conf", {
        method: "POST",
        body: formData,
      });

      setAsSaved(true);

      setRequireRestart(responseJSON.requires_restart);
      setConfigJson(responseJSON.user_config);
    } catch (error) {
      setAlert("Error", JSON.parse(error.body).message);
    }
  };

  const onClickManageUsers = (e: React.MouseEvent) => {
    navigateTo(siteMap.manageUsers.path, undefined, e);
  };

  const timeoutIdRef = React.useRef<number | undefined>();
  React.useEffect(() => {
    if (status === "restarting") {
      timeoutIdRef.current = window.setTimeout(() => {
        checkHeartbeat("/heartbeat")
          .then(() => {
            console.log("Orchest available");
            setStatus("online");
          })
          .catch((retries) => {
            console.log(
              `Update service heartbeat checking timed out after ${retries} retries.`
            );
          });
      }, 5000); // allow 5 seconds for orchest-ctl to stop orchest
    }
    return () => {
      if (timeoutIdRef.current) window.clearTimeout(timeoutIdRef.current);
    };
  }, [status]);

  const restartOrchest = () => {
    return setConfirm(
      "Warning",
      "Are you sure you want to restart Orchest? This will kill all running Orchest containers (including kernels/pipelines).",
      async (resolve) => {
        setRequireRestart([]);
        setStatus("restarting");
        try {
          await fetcher("/async/restart", { method: "POST" });
          resolve(true);

          return true;
        } catch (error) {
          console.error(error);
          resolve(false);
          setAlert("Error", "Could not trigger restart.");
          return false;
        }
      }
    );
  };

  const loadConfigureJupyterLab = (e: React.MouseEvent) => {
    navigateTo(siteMap.configureJupyterLab.path, undefined, e);
  };

  const checkUpdate = useCheckUpdate();

  const checkOrchestStatus = React.useCallback(async () => {
    try {
      await fetcher("/heartbeat");
      setStatus("online");
    } catch (err) {
      setStatus("offline");
    }
  }, []);

  React.useEffect(() => {
    checkOrchestStatus();
    // getConfig();
  }, [checkOrchestStatus]);

  const isConfigValid = React.useMemo(() => {
    try {
      if (hasValue(userConfig)) JSON.parse(userConfig);
      return true;
    } catch (error) {
      return false;
    }
  }, [userConfig]);

  // TODO: show host info after k8s migration is complete
  const shouldShowHostInfo = false;

  return (
    <Layout>
      <div className={"view-page orchest-settings"}>
        <PageTitle>Orchest settings</PageTitle>
        <div className="push-down">
          <div>
            {userConfig === undefined ? (
              <Typography>Loading config...</Typography>
            ) : (
              <Box>
                <CodeMirror
                  value={userConfig}
                  options={{
                    mode: "application/json",
                    theme: "jupyter",
                    lineNumbers: true,
                  }}
                  onBeforeChange={(editor, data, value) => {
                    setUserConfig((prevValue) => {
                      setAsSaved(prevValue === value);
                      return value;
                    });
                  }}
                />
                <Stack
                  direction="column"
                  spacing={2}
                  sx={{
                    marginTop: (theme) => theme.spacing(2),
                    marginBottom: (theme) => theme.spacing(2),
                  }}
                >
                  {!isConfigValid && (
                    <Alert severity="warning">
                      Your input is not valid JSON.
                    </Alert>
                  )}
                  {requiresRestart.length > 0 && (
                    <Alert severity="info">{`Restart Orchest for the changes to ${requiresRestart
                      .map((val) => `"${val}"`)
                      .join(" ")} to take effect.`}</Alert>
                  )}
                </Stack>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => saveConfig(userConfig)}
                >
                  {hasUnsavedChanges ? "SAVE*" : "SAVE"}
                </Button>
              </Box>
            )}
          </div>
        </div>
        <h3>System status</h3>
        <div className="columns">
          <div className="column">
            <p>Version information.</p>
          </div>
          <div className="column">
            {version ? (
              <p>{version}</p>
            ) : (
              <LinearProgress className="push-down" />
            )}
            {config?.FLASK_ENV === "development" && (
              <p>
                <Code>development mode</Code>
              </p>
            )}
          </div>
          <div className="clear"></div>
        </div>
        {shouldShowHostInfo && (
          <>
            <div className="columns">
              <div className="column">
                <p>Disk usage.</p>
              </div>
              <div className="column">
                {hasValue(hostInfo) ? (
                  <>
                    <LinearProgress
                      className="disk-size-info"
                      variant="determinate"
                      value={hostInfo.disk_info.used_pcent}
                    />

                    <div className="disk-size-info push-up-half">
                      <span>{hostInfo.disk_info.used_GB + "GB used"}</span>
                      <span className="float-right">
                        {hostInfo.disk_info.avail_GB + "GB free"}
                      </span>
                    </div>
                  </>
                ) : (
                  <LinearProgress className="push-down disk-size-info" />
                )}
              </div>
            </div>
            <div className="clear"></div>
          </>
        )}
        <h3>JupyterLab configuration</h3>
        <div className="columns">
          <div className="column">
            <p>Configure JupyterLab by installing server extensions.</p>
          </div>
          <div className="column">
            <StyledButtonOutlined
              variant="outlined"
              color="secondary"
              startIcon={<TuneIcon />}
              onClick={loadConfigureJupyterLab}
              onAuxClick={loadConfigureJupyterLab}
            >
              Configure JupyterLab
            </StyledButtonOutlined>
          </div>
          <div className="clear"></div>
        </div>

        <h3>Updates</h3>
        <div className="columns">
          <div className="column">
            <p>Update Orchest from the web UI using the built in updater.</p>
          </div>
          <div className="column">
            <StyledButtonOutlined
              variant="outlined"
              color="secondary"
              startIcon={<SystemUpdateAltIcon />}
              onClick={checkUpdate}
              onAuxClick={checkUpdate}
            >
              Check for updates
            </StyledButtonOutlined>
          </div>
          <div className="clear"></div>
        </div>

        <h3>Controls</h3>
        <div className="columns">
          <div className="column">
            <p>
              Restart Orchest will force quit ongoing builds, jobs and sessions.
            </p>
          </div>
          <div className="column">
            {status !== "restarting" ? (
              <StyledButtonOutlined
                variant="outlined"
                color="secondary"
                startIcon={<PowerSettingsNewIcon />}
                onClick={restartOrchest}
                data-test-id="restart"
              >
                Restart
              </StyledButtonOutlined>
            ) : (
              <>
                <LinearProgress className="push-down" />
                <p>This can take up to 1 minute.</p>
              </>
            )}
            <p className="push-up">
              {`Orchest's current status is `}
              <i>{status}</i>
              {`.`}
            </p>
          </div>
          <div className="clear"></div>
        </div>

        <h3>Authentication</h3>
        <div className="columns">
          <div className="column">
            <p>Manage Orchest users using the user admin panel.</p>
          </div>
          <div className="column">
            <StyledButtonOutlined
              variant="outlined"
              color="secondary"
              onClick={onClickManageUsers}
              onAuxClick={onClickManageUsers}
              startIcon={<PeopleIcon />}
              data-test-id="manage-users"
            >
              Manage users
            </StyledButtonOutlined>
          </div>
          <div className="clear"></div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsView;
