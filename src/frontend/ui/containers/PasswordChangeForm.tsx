import {
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Text,
  FormErrorMessage,
} from "@chakra-ui/react";
import { Form, Formik } from "formik";
import React from "react";
import { validateOpenApiPath } from "../utils/validation";

const validator = validateOpenApiPath("/v1/me/password");

const PasswordChangeForm: React.FC<{
  onSubmit: (values: { password: string }) => Promise<void>;
}> = ({ onSubmit }) => {
  return (
    <Formik
      initialValues={{
        password: "",
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
      }) => (
        <Form>
          <Stack spacing={4}>
            <Text>Please choose a new password.</Text>
            <FormControl
              id="password"
              isInvalid={touched.password && !!errors.password}
            >
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                placeholder="Password"
                isDisabled={isSubmitting}
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.password}
              />
              <FormErrorMessage>Password {errors.password}</FormErrorMessage>
            </FormControl>
            <Button
              type="submit"
              colorScheme="green"
              isLoading={isSubmitting}
              size="md"
            >
              Continue
            </Button>
            {status && (
              <FormControl isInvalid>
                <FormErrorMessage>{status}</FormErrorMessage>
              </FormControl>
            )}
          </Stack>
        </Form>
      )}
    </Formik>
  );
};

export default PasswordChangeForm;
