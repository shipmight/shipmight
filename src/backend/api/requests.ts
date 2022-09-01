import { paths } from "./generated/apiSchema";

// TypeScript monstrosities ahead…

// Helpers

type JsonResponseObject = {
  content: {
    "application/json": unknown;
  };
};

// GetRequestResponse

export type ApiGetPath = keyof Pick<
  paths,
  {
    [K in keyof paths]: paths[K] extends {
      get: {
        responses: Record<string | number, JsonResponseObject>;
      };
    }
      ? K
      : never;
  }[keyof paths]
>;

export type ApiGetRequestResponse<
  P extends ApiGetPath,
  S extends keyof paths[P]["get"]["responses"]
> = paths[P]["get"]["responses"][S] extends JsonResponseObject
  ? paths[P]["get"]["responses"][S]["content"]["application/json"]
  : never;

export type ApiGetRequestResponses<P extends ApiGetPath> = {
  [S in keyof paths[P]["get"]["responses"]]: paths[P]["get"]["responses"][S] extends JsonResponseObject
    ? paths[P]["get"]["responses"][S]["content"]["application/json"] | undefined
    : never;
};

// PostRequestResponse

export type ApiPostPath = keyof Pick<
  paths,
  {
    [K in keyof paths]: paths[K] extends {
      post: {
        responses: Record<string | number, JsonResponseObject>;
        requestBody: JsonResponseObject;
      };
    }
      ? K
      : never;
  }[keyof paths]
>;

export type ApiPostRequestResponse<
  P extends ApiPostPath,
  S extends keyof paths[P]["post"]["responses"]
> = paths[P]["post"]["responses"][S] extends JsonResponseObject
  ? paths[P]["post"]["responses"][S]["content"]["application/json"]
  : never;

export type ApiPostRequestResponses<P extends ApiPostPath> = {
  [S in keyof paths[P]["post"]["responses"]]: paths[P]["post"]["responses"][S] extends JsonResponseObject
    ?
        | paths[P]["post"]["responses"][S]["content"]["application/json"]
        | undefined
    : never;
};

// PostRequestPayload

export type ApiPostRequestPayload<P extends ApiPostPath> =
  paths[P]["post"]["requestBody"]["content"]["application/json"];

// DeleteRequestResponse

export type ApiDeletePath = keyof Pick<
  paths,
  {
    [K in keyof paths]: paths[K] extends {
      delete: {
        responses: Record<string | number, JsonResponseObject>;
      };
    }
      ? K
      : never;
  }[keyof paths]
>;

export type ApiDeleteRequestResponse<
  P extends ApiDeletePath,
  S extends keyof paths[P]["delete"]["responses"]
> = paths[P]["delete"]["responses"][S] extends JsonResponseObject
  ? paths[P]["delete"]["responses"][S]["content"]["application/json"]
  : never;

export type ApiDeleteRequestResponses<P extends ApiDeletePath> = {
  [S in keyof paths[P]["delete"]["responses"]]: paths[P]["delete"]["responses"][S] extends JsonResponseObject
    ?
        | paths[P]["delete"]["responses"][S]["content"]["application/json"]
        | undefined
    : never;
};
