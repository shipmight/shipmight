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

const validator = validateOpenApiPath("/v1/users");

const CreateUserForm: React.FC<{
  onCancel?: () => void;
  onSubmit: (values: { username: string }) => Promise<void>;
  initialValues?: Pick<components["schemas"]["User"], "username">;
}> = ({ onCancel, onSubmit, initialValues }) => {
  return (
    <Formik
      initialValues={{
        username: initialValues ? initialValues.username : "",
      }}
      validate={validator}
      onSubmit={async (data, { setStatus }) => {
        setStatus(null);
        try {
          await onSubmit(data);
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
              <FormControl
                id="username"
                isInvalid={touched.username && !!errors.username}
              >
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  isDisabled={isSubmitting}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.username}
                />
                <FormErrorMessage>Username {errors.username}</FormErrorMessage>
                <FormHelperText>
                  Must consist of lowercase alphabets (a-z), numbers (0-9) and
                  dashes (-). May not begin or end with a dash.
                </FormHelperText>
              </FormControl>
              <HStack align="space-between">
                <Button
                  type="submit"
                  colorScheme="green"
                  isLoading={isSubmitting}
                >
                  {initialValues ? "Save changes" : "Create user"}
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

export default CreateUserForm;
