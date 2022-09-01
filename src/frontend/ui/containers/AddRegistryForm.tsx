import {
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  FormErrorMessage,
  HStack,
  FormHelperText,
  Code,
} from "@chakra-ui/react";
import { Form, Formik } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { validateOpenApiPath } from "../utils/validation";

const validator = validateOpenApiPath("/v1/registries");

const AddRegistryForm: React.FC<{
  onCancel?: () => void;
  onSubmit: (values: {
    name: string;
    url: string;
    authToken: string | undefined;
  }) => Promise<void>;
  initialValues?: Pick<
    components["schemas"]["Registry"],
    "name" | "url" | "authMethod"
  >;
}> = ({ onCancel, onSubmit, initialValues }) => {
  const authTokenInputRef = useRef<HTMLInputElement>();
  const [changeAuthToken, setChangeAuthToken] = useState(false);

  useEffect(() => {
    if (authTokenInputRef.current && changeAuthToken) {
      authTokenInputRef.current.focus();
    }
  }, [authTokenInputRef, changeAuthToken]);

  return (
    <Formik
      initialValues={{
        name: initialValues ? initialValues.name : "",
        url: initialValues ? initialValues.url : "",
        authToken: "",
      }}
      validate={validator}
      onSubmit={async (data, { setStatus }) => {
        setStatus(null);
        try {
          const values = { ...data };
          if (
            initialValues &&
            initialValues.authMethod === "TOKEN" &&
            !changeAuthToken
          ) {
            values.authToken = undefined;
          }
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
        setFieldValue,
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
                  placeholder="GitHub Container Registry"
                  isDisabled={isSubmitting}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.name}
                />
                <FormErrorMessage>Name {errors.name}</FormErrorMessage>
              </FormControl>
              <FormControl id="url" isInvalid={touched.url && !!errors.url}>
                <FormLabel>URL</FormLabel>
                <Input
                  type="text"
                  placeholder="ghcr.io/<username>"
                  isDisabled={isSubmitting}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.url}
                />
                <FormErrorMessage>URL {errors.url}</FormErrorMessage>
              </FormControl>
              <FormControl
                id="authToken"
                isInvalid={touched.authToken && !!errors.authToken}
              >
                <FormLabel>Auth token (optional)</FormLabel>
                {initialValues && initialValues.authMethod === "TOKEN" ? (
                  <Stack spacing={2} mb={3}>
                    <Input
                      type="text"
                      ref={authTokenInputRef}
                      onChange={(event) => {
                        let value = event.target.value;
                        if (value.trim() === "") {
                          value = "";
                        }
                        setFieldValue("authToken", value);
                      }}
                      onBlur={handleBlur}
                      value={values.authToken}
                      isDisabled={isSubmitting || !changeAuthToken}
                      placeholder={
                        changeAuthToken
                          ? "New auth token (leave empty to remove)"
                          : "**********"
                      }
                    />
                    <Button
                      colorScheme="gray"
                      variant={changeAuthToken ? "outline" : "solid"}
                      size="xs"
                      onClick={() => {
                        setChangeAuthToken((value) => !value);
                      }}
                    >
                      {changeAuthToken
                        ? "Don’t change auth token"
                        : "Change auth token"}
                    </Button>
                  </Stack>
                ) : (
                  <Input
                    type="text"
                    isDisabled={isSubmitting}
                    onChange={(event) => {
                      let value = event.target.value;
                      if (value.trim() === "") {
                        value = "";
                      }
                      setFieldValue("authToken", value);
                    }}
                    onBlur={handleBlur}
                    value={values.authToken}
                  />
                )}
                <FormErrorMessage>
                  Auth token {errors.authToken}
                </FormErrorMessage>
                {!initialValues && (
                  <>
                    <FormHelperText>
                      Generate auth token using your credentials:
                    </FormHelperText>
                    <Code>{`echo "<username>:<password>" | base64`}</Code>
                  </>
                )}
              </FormControl>
              <HStack align="space-between">
                <Button
                  type="submit"
                  colorScheme="green"
                  isLoading={isSubmitting}
                >
                  {initialValues ? "Save changes" : "Add registry"}
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

export default AddRegistryForm;
