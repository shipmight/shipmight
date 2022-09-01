import { CheckIcon, WarningIcon } from "@chakra-ui/icons";
import { CircularProgress, HStack, Text } from "@chakra-ui/react";
import React, { ReactElement } from "react";
import { RoundOrdbIcon } from "./icon";

type StatusVariant = "muted" | "success" | "error";
type IconComponent = React.FC<{ color: string; size: number }>;

const statusVariants: Record<
  StatusVariant,
  {
    VariantIcon: IconComponent;
    iconColor: string;
    textColor: string;
  }
> = {
  muted: {
    VariantIcon: React.Fragment,
    iconColor: "gray.300",
    textColor: "gray.500",
  },
  success: {
    VariantIcon: CheckIcon,
    iconColor: "green.400",
    textColor: "green.600",
  },
  error: {
    VariantIcon: WarningIcon,
    iconColor: "red.400",
    textColor: "red.600",
  },
};

export const Status: React.FC<{
  variant?: StatusVariant;
  loading?: boolean;
  orb?: boolean;
  Icon?: IconComponent;
  title?: string;
}> = ({
  variant = "muted",
  loading,
  orb,
  Icon,
  title,
  children,
}): ReactElement => {
  const { VariantIcon, iconColor, textColor } = statusVariants[variant];

  const IconComponent = Icon || VariantIcon;

  return (
    <HStack spacing={1}>
      {loading ? (
        <CircularProgress size={4} color={iconColor} isIndeterminate />
      ) : orb ? (
        <RoundOrdbIcon size={4} color={iconColor} />
      ) : (
        <IconComponent size={4} color={iconColor} />
      )}
      <Text size="sm" color={textColor} title={title} isTruncated>
        {children}
      </Text>
    </HStack>
  );
};
