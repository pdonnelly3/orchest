import { useGlobalContext } from "@/contexts/GlobalContext";
import React from "react";
import { useIsEditingActiveCronJob } from "../job-view/hooks/useIsEditingActiveCronJob";
import { useEditJob } from "../stores/useEditJob";

export const useUnsavedChangesWarning = () => {
  const { isEditingActiveCronJob } = useIsEditingActiveCronJob();
  const { setConfirm } = useGlobalContext();
  const hasUnsavedCronJobChanges = useEditJob(
    (state) => state.hasUnsavedCronJobChanges
  );
  const discardActiveCronJobChanges = useEditJob(
    (state) => state.discardActiveCronJobChanges
  );

  const shouldConfirm = isEditingActiveCronJob && hasUnsavedCronJobChanges;

  const withConfirmation = React.useCallback(
    (action: () => void) => {
      if (shouldConfirm) {
        setConfirm(
          "Warning",
          "There are unsaved changes. Are you sure you want to navigate away?",
          (resolve) => {
            if (hasUnsavedCronJobChanges) discardActiveCronJobChanges();
            action();
            resolve(true);
            return true;
          }
        );
      } else {
        action();
      }
    },
    [
      shouldConfirm,
      discardActiveCronJobChanges,
      hasUnsavedCronJobChanges,
      setConfirm,
    ]
  );

  return { withConfirmation };
};
