import { useThrottle } from "@/hooks/useThrottle";
import ArrowDropDownOutlinedIcon from "@mui/icons-material/ArrowDropDownOutlined";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import React from "react";
import { useEditJob } from "../stores/useEditJob";
import { useJobPrimaryButtonActions } from "./hooks/useJobPrimaryButtonActions";
import { JobPrimaryActionMenu } from "./JobPrimaryActionMenu";
import { JobPrimaryButtonIcon } from "./JobPrimaryButtonIcon";

export const JobPrimaryButton = () => {
  const hasStarted = useEditJob(
    (state) =>
      state.jobChanges?.status === "STARTED" ||
      state.jobChanges?.status === "PENDING"
  );
  const [buttonLabel, mainAction, iconType] = useJobPrimaryButtonActions();

  const buttonRef = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState<Element>();
  const openMenu = () => setAnchor(buttonRef.current ?? undefined);
  const closeMenu = () => setAnchor(undefined);

  const { withThrottle } = useThrottle();

  // Prevent the unintentional second click.
  const handleClick = mainAction ? withThrottle(mainAction) : undefined;

  return (
    <>
      <ButtonGroup
        ref={buttonRef}
        variant={hasStarted ? "outlined" : "contained"}
        color="primary"
        size="small"
      >
        <Button
          startIcon={<JobPrimaryButtonIcon type={iconType} />}
          onClick={handleClick}
        >
          {buttonLabel}
        </Button>
        {iconType !== "duplicate" && (
          <Button
            sx={{
              backgroundColor: (theme) =>
                !hasStarted ? theme.palette.primary.dark : "inherit",
            }}
            size="small"
            onClick={openMenu}
          >
            <ArrowDropDownOutlinedIcon fontSize="small" />
          </Button>
        )}
      </ButtonGroup>
      <JobPrimaryActionMenu anchor={anchor} onClose={closeMenu} />
    </>
  );
};
