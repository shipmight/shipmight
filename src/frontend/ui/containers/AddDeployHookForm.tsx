import {
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  FormErrorMessage,
  HStack,
  FormHelperText,
} from "@chakra-ui/react";
import { Form, Formik } from "formik";
import React from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { validateOpenApiPath } from "../utils/validation";

const validator = validateOpenApiPath("/v1/apps/{appId}/deploy-hooks");

const AddDeployHookForm: React.FC<{
  onCancel?: () => void;
  onSubmit: (
    values: Pick<components["schemas"]["DeployHook"], "name">
  ) => Promise<void>;
}> = ({ onCancel, onSubmit }) => {
  return (
    <Formik
      initialValues={{
        name: "",
      }}
      validate={validator}
      onSubmit={async (values, { setStatus }) => {
        setStatus(null);
        try {
          await onSubmit(values);
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
        touched,
        errors,
        status,
      }) => {
        return (
          <Form>
            <Stack spacing={4}>
              <FormControl id="name" isInvalid={touched.name && !!errors.name}>
                <FormLabel>Name</FormLabel>
                <Input
                  type="text"
                  isDisabled={isSubmitting}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.name}
                />
                <FormErrorMessage>Name {errors.name}</FormErrorMessage>
                <FormHelperText>
                  Set a descriptive name for this hook so you’ll remember what
                  it’s used for. Cannot be changed later.
                </FormHelperText>
              </FormControl>
              <HStack align="space-between">
                <Button
                  type="submit"
                  colorScheme="green"
                  isLoading={isSubmitting}
                >
                  Create deploy hook
                </Button>
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

export default AddDeployHookForm;
