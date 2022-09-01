import { LockIcon, DeleteIcon } from "@chakra-ui/icons";
import {
  Alert,
  AlertDescription,
  Button,
  ButtonGroup,
  Text,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  InputRightAddon,
  Link,
  Stack,
  InputLeftAddon,
  CircularProgress,
  Textarea,
  Badge,
  Code,
  Checkbox,
} from "@chakra-ui/react";
import { formatDuration, intervalToDuration } from "date-fns";
import { Formik, Form } from "formik";
import React, { useCallback, useEffect, useState } from "react";
import { components } from "../../../backend/api/generated/apiSchema";
import { get } from "../apiFetch";
import { SubmitButton } from "../components/button";
import { Card, CardBody } from "../components/card";
import { ErrorBoundary, ErrorView } from "../components/error";
import { Select } from "../components/form";
import useSimplePolling from "../utils/useSimplePolling";
import {
  schemaForSpecificValuesFields,
  jsonSchemaValuesValidator,
} from "../utils/validation";

type UnknownDataObject = { [key: string]: unknown };

type InputProps = {
  isDisabled: boolean;
  isTouched: boolean;
  setFieldTouched: () => void;
  setFieldValue: (newValue: unknown) => void;
  value: unknown;
  errors: unknown;
};

const SingleLineTextInput: React.FC<
  InputProps & {
    input: components["schemas"]["SingleLineTextInput"];
  }
> = ({ isDisabled, setFieldTouched, setFieldValue, value, input }) => {
  if (typeof value !== "string") {
    throw new Error(`unexpected value type ${typeof value}`);
  }

  return (
    <Input
      type="text"
      placeholder={input.placeholder || ""}
      isDisabled={isDisabled}
      onKeyDown={() => setFieldTouched()}
      onChange={(event) => setFieldValue(event.target.value)}
      onBlur={(event) => setFieldValue(event.target.value.trim())}
      value={value}
    />
  );
};

const RegistrySelectInput: React.FC<
  InputProps & {
    input: components["schemas"]["RegistrySelectInput"];
    getRegistries: () => Promise<components["schemas"]["Registry"][]>;
  }
> = ({ isDisabled, isTouched, setFieldValue, value, getRegistries }) => {
  if (typeof value !== "string") {
    throw new Error(`unexpected value type ${typeof value}`);
  }

  useEffect(() => {
    if (!isTouched && value === "") {
      getRegistries().then((registries) => {
        const firstRegistry = registries[0];
        if (firstRegistry) {
          setFieldValue(firstRegistry.id);
        }
      });
    }
  }, [isTouched, value]);

  return (
    <Select
      placeholder="Select registry…"
      emptyText="No registries"
      isDisabled={isDisabled}
      value={value}
      getItems={getRegistries}
      valueProp="id"
      displayProp="name"
      onClear={() => {
        setFieldValue("");
      }}
      onChange={(registryId) => {
        setFieldValue(registryId);
      }}
      renderItem={(registry) => (
        <Stack spacing={0}>
          <Text>{registry.name}</Text>
          <HStack spacing={0}>
            {registry.authMethod === "TOKEN" && (
              <LockIcon height={2} color="gray.500" />
            )}
            <Text display="block" fontSize="xs">
              {registry.url}
            </Text>
          </HStack>
        </Stack>
      )}
    />
  );
};

const NumberInput: React.FC<
  InputProps & {
    input: components["schemas"]["NumberInput"];
  }
> = ({ isDisabled, setFieldTouched, setFieldValue, value, input }) => {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error(`unexpected value type ${typeof value}`);
  }

  return (
    <Stack spacing={2}>
      <HStack spacing={3}>
        <InputGroup size="sm" flex="0">
          <Input
            textAlign="center"
            value={value}
            width="60px"
            isDisabled={isDisabled}
            onKeyDown={() => setFieldTouched()}
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9]/g, "");
              setFieldValue(value === "" ? "" : parseInt(value));
            }}
          />
          {input.rightLabel && (
            <InputRightAddon>{input.rightLabel}</InputRightAddon>
          )}
        </InputGroup>
        {input.presets && (
          <ButtonGroup size="xs" isAttached>
            {input.presets.map((preset, presetIndex) => (
              <Button
                key={presetIndex}
                variant="solid"
                colorScheme={preset === value ? "blue" : "gray"}
                onClick={() => {
                  setFieldValue(preset);
                }}
              >
                {preset}
              </Button>
            ))}
          </ButtonGroup>
        )}
        {input.setToEmptyString && (
          <Checkbox
            isChecked={value === ""}
            onChange={() => {
              setFieldValue("");
            }}
          >
            <Text fontSize="sm">{input.setToEmptyString}</Text>
          </Checkbox>
        )}
      </HStack>
      {input.showSecondsInHumanFriendlyTime && (
        <FormHelperText>
          {typeof value === "number" && value < 1000000000
            ? formatDuration(
                intervalToDuration({ start: 0, end: value * 1000 })
              )
            : "–"}
        </FormHelperText>
      )}
    </Stack>
  );
};

const ImageTagInput: React.FC<
  InputProps & {
    input: components["schemas"]["ImageTagInput"];
    getRegistries: () => Promise<components["schemas"]["Registry"][]>;
    values: UnknownDataObject;
  }
> = ({
  isDisabled,
  setFieldTouched,
  setFieldValue,
  value,
  values,
  input,
  getRegistries,
}) => {
  if (typeof value !== "string") {
    throw new Error(`unexpected value type ${typeof value}`);
  }

  const { registryUrlFromFieldId, imageNameFromFieldId } = input;

  const {
    load,
    hasData,
    data,
    isLoading,
    hasErrored,
    retry,
    subsequentErrors,
  } = useSimplePolling(
    {
      fetchData: async () => {
        const registries = await getRegistries();
        const registriesById = new Map<
          string,
          components["schemas"]["Registry"]
        >();
        for (const registry of registries) {
          registriesById.set(registry.id, registry);
        }
        return registriesById;
      },
    },
    []
  );

  useEffect(() => {
    if (registryUrlFromFieldId) {
      load();
    }
  }, [registryUrlFromFieldId]);

  if (!registryUrlFromFieldId || hasData) {
    let leftAddon = "";
    if (registryUrlFromFieldId && data) {
      const registryUrlValue = values[registryUrlFromFieldId];
      if (typeof registryUrlValue === "string") {
        const registryUrl: string = data.has(registryUrlValue)
          ? data.get(registryUrlValue).url
          : "";
        leftAddon += registryUrl;
      }
    }
    if (imageNameFromFieldId) {
      const imageNameValue = values[imageNameFromFieldId];
      const imageName: string =
        typeof imageNameValue === "string" && imageNameValue !== ""
          ? imageNameValue
          : "[image]";
      if (imageName) {
        if (leftAddon.length) {
          leftAddon += "/";
        }
        leftAddon += imageName;
      }
    }
    if (leftAddon.length) {
      leftAddon += ":";
    }
    return (
      <Stack spacing={2}>
        <HStack spacing={2}>
          <InputGroup size="sm">
            {leftAddon !== "" && <InputLeftAddon>{leftAddon}</InputLeftAddon>}
            <Input
              type="text"
              isDisabled={isDisabled}
              onKeyDown={() => setFieldTouched()}
              onChange={(event) => setFieldValue(event.target.value)}
              onBlur={(event) => setFieldValue(event.target.value.trim())}
              value={value}
            />
          </InputGroup>
        </HStack>
        {value === "latest" && (
          <HStack spacing={1}>
            <Badge colorScheme="blue" variant="outline">
              Note
            </Badge>
            <FormHelperText>
              Using “latest” is not recommended in production. Consider using a
              more specific tag.
            </FormHelperText>
          </HStack>
        )}
      </Stack>
    );
  }

  if (isLoading) {
    return <CircularProgress size={6} color="gray.500" isIndeterminate />;
  }

  if (hasErrored) {
    return <ErrorView retry={() => retry()} errors={subsequentErrors} />;
  }

  return null;
};

const EnvironmentVariablesInput: React.FC<
  InputProps & {
    // This component should not become too complicated to suite both input
    // types. For the time being there's nothing special about the preset-input,
    // but in the future it could have more features and at that point it should
    // be separated into different component.
    input:
      | components["schemas"]["EnvironmentVariablesInput"]
      | components["schemas"]["EnvironmentVariablesPresetInput"];
  }
> = ({ input, isDisabled, setFieldValue, value, errors }) => {
  const [focusIndex, setFocusIndex] = useState<number>();
  const fromPreset = "fromPreset" in input ? input.fromPreset : undefined;

  if (!Array.isArray(value)) {
    throw new Error(`expected an array but got ${typeof value}`);
  }

  if (fromPreset && value.length === 0) {
    return <Text>No fields.</Text>;
  }

  return (
    <Stack spacing={2} divider={<Divider borderColor="gray.200" />}>
      {value.map((item, itemIndex) => {
        const error = Array.isArray(errors) ? errors[itemIndex] : undefined;
        return (
          <Stack key={itemIndex} spacing={1}>
            <HStack spacing={2} align="start">
              <FormControl isInvalid={error && error.name} width="40%">
                {fromPreset ? (
                  <Code>{item.name}</Code>
                ) : (
                  <Input
                    autoFocus={itemIndex === focusIndex}
                    size="xs"
                    fontFamily="mono"
                    value={item.name}
                    placeholder="NAME"
                    onChange={(event) => {
                      setFieldValue(
                        value.map((item, index) => {
                          if (index === itemIndex) {
                            return {
                              ...item,
                              name: event.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9_]/g, ""),
                            };
                          }
                          return item;
                        })
                      );
                    }}
                  />
                )}
              </FormControl>
              <FormControl isInvalid={error && error.value}>
                <Textarea
                  size="xs"
                  minHeight="24px"
                  paddingTop="4px"
                  paddingBottom="4px"
                  fontFamily="mono"
                  value={item.value}
                  placeholder="value"
                  onChange={(event) => {
                    setFieldValue(
                      value.map((item, index) => {
                        if (index === itemIndex) {
                          return {
                            ...item,
                            value: event.target.value,
                          };
                        }
                        return item;
                      })
                    );
                  }}
                />
              </FormControl>
              {!fromPreset && (
                <Button
                  size="xs"
                  colorScheme="gray"
                  variant="ghost"
                  title="Remove environment variable"
                  onClick={() => {
                    setFieldValue(
                      value.filter((item, index) => index !== itemIndex)
                    );
                  }}
                >
                  <DeleteIcon />
                </Button>
              )}
            </HStack>
            {error && error.mountPath && (
              <FormControl isInvalid>
                <FormErrorMessage>
                  Mount path {error.mountPath}
                </FormErrorMessage>
              </FormControl>
            )}
          </Stack>
        );
      })}
      {!fromPreset && (
        <HStack>
          <Button
            size="xs"
            colorScheme="gray"
            variant="outline"
            isDisabled={isDisabled}
            onClick={() => {
              setFieldValue([...value, { name: "", value: "" }]);
              setFocusIndex(value.length);
            }}
          >
            Add environment variable
          </Button>
        </HStack>
      )}
    </Stack>
  );
};

const FileMountsInput: React.FC<
  InputProps & {
    input: components["schemas"]["FileMountsInput"];
    getFiles: () => Promise<components["schemas"]["File"][]>;
  }
> = ({ isDisabled, setFieldValue, value, getFiles, errors }) => {
  const [fileNames, setFileNames] = useState<Map<string, string>>(
    () => new Map()
  );

  // Piggyback off getFiles, so that when <Select> is refreshed by user, we
  // also refresh the name cache here
  const getFilesFn = useCallback(async () => {
    const files = await getFiles();
    const names = new Map<string, string>();
    for (const file of files) {
      names.set(file.id, file.name);
    }
    setFileNames(names);
    return files;
  }, [getFiles]);

  if (!Array.isArray(value)) {
    throw new Error(`expected an array but got ${typeof value}`);
  }

  return (
    <Stack spacing={2} divider={<Divider borderColor="gray.200" />}>
      {value.map((item, itemIndex) => {
        const fileName = fileNames.get(item.fileId) || "(unknown)";
        const error = Array.isArray(errors) ? errors[itemIndex] : undefined;

        return (
          <Stack key={itemIndex} spacing={1}>
            <HStack spacing={2}>
              <Text isTruncated title={fileName} width="160px">
                {fileName}
              </Text>
              <FormControl isInvalid={error && error.mountPath}>
                <Input
                  size="xs"
                  fontFamily="mono"
                  value={item.mountPath}
                  placeholder="Absolute mount path, e.g. '/var/example.json'"
                  onChange={(event) => {
                    const mountPath = event.target.value;
                    setFieldValue(
                      value.map((item, index) => {
                        if (index === itemIndex) {
                          return {
                            ...item,
                            mountPath,
                          };
                        }
                        return item;
                      })
                    );
                  }}
                />
              </FormControl>
              <Button
                size="xs"
                colorScheme="gray"
                variant="ghost"
                title="Remove file mount"
                onClick={() => {
                  setFieldValue(
                    value.filter((item, index) => index !== itemIndex)
                  );
                }}
              >
                <DeleteIcon />
              </Button>
            </HStack>
            {error && error.mountPath && (
              <FormControl isInvalid>
                <FormErrorMessage>
                  Mount path {error.mountPath}
                </FormErrorMessage>
              </FormControl>
            )}
          </Stack>
        );
      })}
      <Select
        placeholder="Mount a file…"
        emptyText="No files"
        isDisabled={isDisabled}
        value=""
        getItems={getFilesFn}
        valueProp="id"
        displayProp="name"
        onChange={(fileId, items) => {
          const file = items.find((item) => item.id === fileId);
          setFieldValue([
            ...value,
            {
              fileId,
              mountPath: `/var/${file.name}`,
            },
          ]);
        }}
      />
    </Stack>
  );
};

const AppFieldsForm: React.FC<{
  projectId: string;
  appChart: components["schemas"]["AppChart"];
  cards: string[][];
  values?: UnknownDataObject;
  onSubmit: (data: UnknownDataObject) => Promise<void>;
  cancelUrl?: string;
  submitText?: string;
}> = ({
  projectId,
  appChart,
  cards,
  values,
  onSubmit,
  submitText,
  cancelUrl,
}) => {
  const getRegistries = useCallback(
    () => get("/v1/registries", {}, {}, 200),
    []
  );

  const getFiles = useCallback(
    () => get("/v1/projects/{projectId}/files", { projectId }, {}, 200),
    [projectId]
  );

  const initialValues = appChart.spec.fields.reduce<{
    [id: string]: unknown;
  }>((valuesObj, field) => {
    let initialValue = values ? values[field.id] : undefined;

    switch (field.input.type) {
      case "SingleLineText": {
        if (typeof initialValue !== "string") {
          const defaultValue = field.input.defaultValue || "";
          initialValue = defaultValue;
        }
        break;
      }

      case "Number": {
        if (typeof initialValue !== "number" && initialValue !== "") {
          const defaultValue = field.input.defaultValue || "";
          initialValue = defaultValue;
        }
        break;
      }

      case "RegistrySelect":
      case "ImageTag": {
        if (typeof initialValue !== "string") {
          initialValue = "";
        }
        break;
      }

      case "EnvironmentVariables":
      case "EnvironmentVariablesPreset":
      case "FileMounts": {
        if (!Array.isArray(initialValue)) {
          const valuesFromPreset =
            field.input.type === "EnvironmentVariables" &&
            field.input.fromPreset &&
            values
              ? values[field.input.fromPreset]
              : undefined;
          const defaultValue =
            valuesFromPreset || field.input.defaultValue || [];
          initialValue = defaultValue;
        }
        break;
      }

      default: {
        const input: { type: string } = field.input;
        throw new Error(
          `unknown input type ${input.type}, cannot set initialValue`
        );
      }
    }

    valuesObj[field.id] = initialValue;

    return valuesObj;
  }, {});

  const resolvedCards = cards.map((configurationCard) => {
    return configurationCard.map((fieldId) =>
      appChart.spec.fields.find((field) => field.id === fieldId)
    );
  });

  const fields = resolvedCards.flatMap((card) => [
    ...card.map((field) => field),
  ]);

  const fieldIds = fields.map((field) => field.id);
  const schema = schemaForSpecificValuesFields(appChart.schema, fieldIds);
  const validate = jsonSchemaValuesValidator(schema);

  const showErrorSummary = resolvedCards.length > 2;

  return (
    <Formik<{ [key: string]: unknown }>
      initialValues={initialValues}
      validate={validate}
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
        setFieldTouched,
        setFieldValue,
        isSubmitting,
        touched,
        errors,
        status,
        submitCount,
      }) => {
        const fieldsWithErrors = appChart.spec.fields.filter(
          (field) => errors[field.id]
        );

        return (
          <Form>
            <Stack spacing={4}>
              {resolvedCards.map((fields, cardIndex) => (
                <Card key={cardIndex}>
                  {fields.map((field) => {
                    const inputProps: InputProps = {
                      isDisabled: isSubmitting,
                      isTouched: touched[field.id],
                      setFieldTouched: () => setFieldTouched(field.id),
                      setFieldValue: (newValue) =>
                        setFieldValue(field.id, newValue),
                      value: values[field.id],
                      errors: errors[field.id],
                    };

                    return (
                      <CardBody key={field.id}>
                        <FormControl
                          id={field.id}
                          isInvalid={
                            touched[field.id] &&
                            typeof errors[field.id] === "string"
                          }
                        >
                          <FormLabel>{field.name}</FormLabel>
                          <ErrorBoundary>
                            {field.input.type === "SingleLineText" ? (
                              <SingleLineTextInput
                                {...inputProps}
                                input={field.input}
                              />
                            ) : field.input.type === "RegistrySelect" ? (
                              <RegistrySelectInput
                                {...inputProps}
                                input={field.input}
                                getRegistries={getRegistries}
                              />
                            ) : field.input.type === "Number" ? (
                              <NumberInput
                                {...inputProps}
                                input={field.input}
                              />
                            ) : field.input.type === "ImageTag" ? (
                              <ImageTagInput
                                {...inputProps}
                                input={field.input}
                                getRegistries={getRegistries}
                                values={values}
                              />
                            ) : field.input.type === "EnvironmentVariables" ? (
                              <EnvironmentVariablesInput
                                {...inputProps}
                                input={field.input}
                              />
                            ) : field.input.type ===
                              "EnvironmentVariablesPreset" ? (
                              <EnvironmentVariablesInput
                                {...inputProps}
                                input={field.input}
                              />
                            ) : field.input.type === "FileMounts" ? (
                              <FileMountsInput
                                {...inputProps}
                                input={field.input}
                                getFiles={getFiles}
                              />
                            ) : (
                              <Alert status="error" variant="left-accent">
                                <AlertDescription>
                                  {`Unsupported input specification for field ${field.id}`}
                                </AlertDescription>
                              </Alert>
                            )}
                          </ErrorBoundary>
                          <FormErrorMessage>
                            {field.name} {errors[field.id]}
                          </FormErrorMessage>
                          {field.help && (
                            <FormHelperText>{field.help}</FormHelperText>
                          )}
                          {field.immutable && (
                            <FormHelperText>
                              Cannot be changed later.
                            </FormHelperText>
                          )}
                        </FormControl>
                      </CardBody>
                    );
                  })}
                </Card>
              ))}
              {(submitText || cancelUrl) && (
                <HStack justify="space-between">
                  {submitText && (
                    <SubmitButton isLoading={isSubmitting}>
                      {submitText}
                    </SubmitButton>
                  )}
                  {cancelUrl && (
                    <Button
                      as={Link}
                      variant="outline"
                      to={cancelUrl}
                      isDisabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  )}
                </HStack>
              )}
              {showErrorSummary &&
                submitCount > 0 &&
                fieldsWithErrors.length > 0 && (
                  <FormControl isInvalid>
                    <FormErrorMessage>
                      {`These fields contain errors: ${fieldsWithErrors
                        .map((field) => field.name)
                        .join(", ")}`}
                    </FormErrorMessage>
                  </FormControl>
                )}
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

export default AppFieldsForm;
