import { AddIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { Button } from "@chakra-ui/react";
import React from "react";

type ButtonProps = Parameters<typeof Button>[0];

export const BackButton: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button
      {...props}
      size="xs"
      colorScheme="gray"
      variant="link"
      leftIcon={<ChevronLeftIcon />}
    >
      {children}
    </Button>
  );
};

export const EmphasizedButton: React.FC<
  ButtonProps & { isEmphasized?: boolean }
> = ({ isEmphasized, children, ...props }) => {
  return (
    <Button
      {...props}
      colorScheme={isEmphasized ? "purple" : "gray"}
      variant={isEmphasized ? "solid" : "outline"}
    >
      {children}
    </Button>
  );
};

export const CreateButton: React.FC<Parameters<typeof EmphasizedButton>[0]> = ({
  children,
  ...props
}) => {
  return (
    <EmphasizedButton {...props} leftIcon={<AddIcon />}>
      {children}
    </EmphasizedButton>
  );
};

export const SubmitButton: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button {...props} colorScheme="green" type="submit">
      {children}
    </Button>
  );
};
