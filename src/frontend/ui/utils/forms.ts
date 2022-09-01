import { FormikErrors } from "formik";

export const getFieldsWithErrors = <T>(
  errors: FormikErrors<T>,
  fieldNames: Record<keyof T, string>
): string[] => {
  const fieldsWithErrors: string[] = Object.keys(fieldNames)
    .filter((field) => errors[field])
    .map((key) => fieldNames[key]);
  return fieldsWithErrors;
};
