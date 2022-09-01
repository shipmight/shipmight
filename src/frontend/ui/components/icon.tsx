import { Icon } from "@chakra-ui/react";
import React from "react";

export const EmptyIcon: React.FC = () => {
  return (
    <Icon viewBox="0 0 200 200">
      <path
        fill="transparent"
        d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0"
      />
    </Icon>
  );
};

export const RoundOrdbIcon: React.FC<Parameters<typeof Icon>[0]> = (props) => {
  return (
    <Icon viewBox="0 0 8 8" {...props}>
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </Icon>
  );
};

export const BoxedArrowForward: React.FC<Parameters<typeof Icon>[0]> = (
  props
) => {
  return (
    <Icon viewBox="0 0 6 5" {...props}>
      <path
        d="M5 0a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1h4ZM3.44.732a.5.5 0 0 0-.708.707L3.293 2H1.5a.5.5 0 0 0-.492.41L1 2.5a.5.5 0 0 0 .5.5h1.792l-.56.56a.5.5 0 0 0-.058.639l.058.069a.5.5 0 0 0 .707 0l1.415-1.414a.508.508 0 0 0 .121-.198l.009-.03.005-.021.003-.015.003-.018A.503.503 0 0 0 5 2.52V2.5a.509.509 0 0 0-.011-.105l-.005-.022-.009-.029-.006-.018a.497.497 0 0 0-.046-.093l-.012-.017-.013-.018a.503.503 0 0 0-.033-.04l-.011-.012Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </Icon>
  );
};

export const KeyIcon: React.FC<Parameters<typeof Icon>[0]> = (props) => {
  return (
    <Icon viewBox="0 0 24 24" {...props}>
      <path
        d="M6 20v3l-1 1H1l-1-1v-4l6.646-6.645A9 9 0 1 1 12 17.488V17H9v3H6ZM16 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </Icon>
  );
};
