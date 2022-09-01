import { ArrowForwardIcon } from "@chakra-ui/icons";
import {
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Text,
  FormErrorMessage,
  HStack,
  FormHelperText,
  InputLeftElement,
  InputGroup,
} from "@chakra-ui/react";
import { Form, Formik } from "formik";
import React, { useState } from "react";
import { SubmitButton } from "../components/button";
import { Select } from "../components/form";
import { validateOpenApiPath } from "../utils/validation";

const validator = validateOpenApiPath("/v1/projects/{projectId}/domains");

type OnSubmitData = {
  hostname: string;
  path: string;
  appId: string | null;
  appServiceTargetId: string | null;
  targetPort: number;
};

const AddDomainForm: React.FC<{
  getTargets: () => Promise<
    {
      name: string;
      hash: string;
      appId: string;
      appServiceTargetId: string;
    }[]
  >;
  onCancel?: () => void;
  onSubmit: (values: OnSubmitData) => Promise<void>;
  initialValues?: OnSubmitData;
}> = ({ getTargets, onCancel, onSubmit, initialValues }) => {
  const [targetHash, setTargetHash] = useState(
    initialValues && initialValues.appId && initialValues.appServiceTargetId
      ? `${initialValues.appId}-${initialValues.appServiceTargetId}`
      : ""
  );

  return (
    <Formik<
      Omit<OnSubmitData, "targetPort"> & {
        targetPort: number | string;
      }
    >
      initialValues={{
        hostname: initialValues ? initialValues.hostname : "",
        path: initialValues ? initialValues.path : "/",
        appId: initialValues ? initialValues.appId || "" : "",
        appServiceTargetId: initialValues
          ? initialValues.appServiceTargetId || ""
          : "",
        targetPort: initialValues ? initialValues.targetPort : 80,
      }}
      validate={validator}
      onSubmit={async (data, { setStatus }) => {
        setStatus(null);
        try {
          if (typeof data.targetPort !== "number") {
            throw new Error("something has gone with live validation");
          }
          await onSubmit({
            ...data,
            appId: data.appId === "" ? null : data.appId,
            appServiceTargetId:
              data.appServiceTargetId === "" ? null : data.appServiceTargetId,
            targetPort: data.targetPort,
          });
        } catch (error) {
          console.error(error);
          setStatus("An unknown error occurred");
        }
      }}
    >
      {({
        values,
        handleChange,
        handleBlur,
        isSubmitting,
        setFieldValue,
        touched,
        errors,
        status,
      }) => {
        return (
          <Form>
            <Stack spacing={4}>
              <FormControl
                id="hostname"
                isInvalid={touched.hostname && !!errors.hostname}
              >
                <FormLabel>Hostname</FormLabel>
                <Input
                  type="text"
                  placeholder="e.g. 'example.com'"
                  isDisabled={isSubmitting || !!initialValues}
                  onChange={handleChange}
                  value={values.hostname}
                />
                <FormErrorMessage>Hostname {errors.hostname}</FormErrorMessage>
                {!initialValues && (
                  <FormHelperText>Cannot be changed later.</FormHelperText>
                )}
              </FormControl>
              <FormControl
                id="appId"
                isInvalid={
                  touched.appId &&
                  (!!errors.appId || !!errors.appServiceTargetId)
                }
              >
                <FormLabel>Target (optional)</FormLabel>
                <Select
                  placeholder="Select target…"
                  emptyText="No apps"
                  isDisabled={isSubmitting}
                  value={targetHash}
                  getItems={getTargets}
                  valueProp="hash"
                  displayProp="name"
                  onClear={() => {
                    setTargetHash("");
                    setFieldValue("appId", "");
                    setFieldValue("appServiceTargetId", "");
                  }}
                  onChange={(hash, items) => {
                    setTargetHash(hash);
                    const target = items.find((item) => item.hash === hash);
                    setFieldValue("appId", target.appId);
                    setFieldValue(
                      "appServiceTargetId",
                      target.appServiceTargetId
                    );
                  }}
                  renderItem={(target) => <Text>{target.name}</Text>}
                  // InputElement used in below input has a z-index of 2:
                  // https://github.com/chakra-ui/chakra-ui/blob/98efb69699b5cfc47158947ed82ea534b67555c1/packages/input/src/input-element.tsx#L22
                  zIndex={3}
                />
                {!!errors.appId && (
                  <FormErrorMessage>Target {errors.appId}</FormErrorMessage>
                )}
                {!!errors.appServiceTargetId && (
                  <FormErrorMessage>
                    Target {errors.appServiceTargetId}
                  </FormErrorMessage>
                )}
                {!initialValues && (
                  <FormHelperText>
                    You can also select the target later. This can be useful if
                    you want to test a domain or its SSL before linking it to an
                    app.
                  </FormHelperText>
                )}
              </FormControl>
              <FormControl
                id="targetPort"
                isInvalid={touched.targetPort && !!errors.targetPort}
              >
                <FormLabel>Target port</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <ArrowForwardIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    width="100px"
                    isDisabled={
                      isSubmitting || values.appServiceTargetId === ""
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      setFieldValue(
                        "targetPort",
                        value.match(/^[0-9]+$/) ? parseInt(value) : value
                      );
                    }}
                    onBlur={handleBlur}
                    value={
                      values.appServiceTargetId !== "" ? values.targetPort : ""
                    }
                  />
                </InputGroup>
                <FormErrorMessage>
                  Target port {errors.targetPort}
                </FormErrorMessage>
                <FormHelperText>
                  Traffic to the domain will be directed at this port in your
                  app. {!initialValues ? "Can be changed later." : ""}
                </FormHelperText>
              </FormControl>
              <HStack align="space-between">
                <SubmitButton isLoading={isSubmitting}>
                  {initialValues ? "Save changes" : "Add domain"}
                </SubmitButton>
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    isDisabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </HStack>
              {status && (
                <FormControl isInvalid>
                  <FormErrorMessage>{status}</FormErrorMessage>
                </FormControl>
              )}
            </Stack>
          </Form>
        );
      }}
    </Formik>
  );
};

export default AddDomainForm;
