import { useAppContext } from "@/contexts/AppContext";
import { useHasChanged } from "@/hooks/useHasChanged";
import { fetcher, hasValue } from "@orchest/lib-utils";
import React from "react";

export type UserConfigJson = Record<string, any>;

export const useUserConfig = () => {
  const {
    state: { config },
  } = useAppContext();

  const generateModifiableConfig = React.useCallback(
    (configJson: UserConfigJson) => {
      if (config?.CLOUD !== true) return configJson;

      const unmodifiableConfigKeys =
        config?.CLOUD_UNMODIFIABLE_CONFIG_VALUES || [];

      // Pick modifiable properties by key
      return Object.entries(configJson).reduce((all, [key, value]) => {
        if (!unmodifiableConfigKeys.includes(key))
          return { ...all, [key]: value };
        return all;
      }, {} as UserConfigJson);
    },
    [config?.CLOUD, config?.CLOUD_UNMODIFIABLE_CONFIG_VALUES]
  );

  const [configJson, setConfigJson] = React.useState<
    UserConfigJson | undefined
  >(undefined);
  const [userConfig, setUserConfig] = React.useState<string | undefined>(
    undefined
  );

  const getConfig = React.useCallback(async () => {
    try {
      fetcher<{ user_config: UserConfigJson }>("/async/user-config").then(
        (response) => {
          setConfigJson(response.user_config);
        }
      );
    } catch (error) {
      setUserConfig("");
      console.warn("Received invalid JSON config from the server.");
    }
  }, []);
  const changed = useHasChanged(configJson);

  React.useEffect(() => {
    if (!changed) return;
    if (hasValue(configJson) && changed) {
      const visibleJSON = generateModifiableConfig(configJson);
      setUserConfig(JSON.stringify(visibleJSON, null, 2));
    }
  }, [configJson, changed, generateModifiableConfig]);

  React.useEffect(() => {
    getConfig();
  }, [getConfig]);

  return {
    userConfig,
    setUserConfig,
    configJson,
    setConfigJson,
  };
};
