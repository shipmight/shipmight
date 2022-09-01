export const linkedToText = (
  singular: string,
  plural: string,
  names: string[],
  options: {
    limit: number;
  } = {
    limit: 3,
  }
): string => {
  let text: string = names.length === 1 ? singular : plural;
  text += ": ";
  text += names.slice(0, options.limit).join(", ");
  if (names.length > options.limit) {
    text += "…";
  }
  return text;
};
