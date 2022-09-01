import {
  ApiDeletePath,
  ApiDeleteRequestResponses,
  ApiGetPath,
  ApiGetRequestResponses,
  ApiPostPath,
  ApiPostRequestPayload,
  ApiPostRequestResponses,
} from "../../backend/api/requests";

export const onUnauthorized: {
  callback?: (
    code: "UNAUTHORIZED" | "PASSWORD_CHANGE_REQUIRED"
  ) => Promise<void>;
} = {};

export class ErrorWithResponse extends Error {
  constructor(msg: string, public response: Response) {
    super(msg);
    Object.setPrototypeOf(this, ErrorWithResponse.prototype);
  }
}

const replaceAndAppendParamsInUrl = (
  url: string,
  urlParams: { [key: string]: string },
  queryParams: { [key: string]: string }
): string => {
  url = url.replace(/^\//, `${window.shipmightGlobals.baseUri}api/`);
  for (const key in urlParams) {
    url = url.replace(`{${key}}`, urlParams[key]);
  }
  const queryString = new URLSearchParams(queryParams).toString();
  if (queryString.length) {
    url += `?${queryString}`;
  }
  return url;
};

export async function get<
  P extends ApiGetPath,
  S extends keyof ApiGetRequestResponses<P>
>(
  path: P,
  urlParams: { [key: string]: string },
  queryParams: { [key: string]: string },
  statusCode: S
): Promise<ApiGetRequestResponses<P>[S]> {
  const url = replaceAndAppendParamsInUrl(path, urlParams, queryParams);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (error) {
    throw new Error(`GET ${url} failed with: ${error.message}`);
  }
  if (res.status !== statusCode) {
    if (onUnauthorized.callback && res.status === 401) {
      let code: "UNAUTHORIZED" | "PASSWORD_CHANGE_REQUIRED" = "UNAUTHORIZED";
      try {
        const data = await res.json();
        if (data.error.message === "password change required") {
          code = "PASSWORD_CHANGE_REQUIRED";
        }
      } catch (error) {
        // do nothing
      }
      const promise = onUnauthorized.callback(code).then(() => {
        return get(path, urlParams, queryParams, statusCode);
      });
      if (code === "UNAUTHORIZED") {
        onUnauthorized.callback = undefined;
      }
      return promise;
    }
    throw new ErrorWithResponse(
      `GET ${url} failed with status code ${res.status}`,
      res
    );
  }
  const data = res.status === 204 ? undefined : await res.json();
  return data as ApiGetRequestResponses<P>[S];
}

export async function post<
  P extends ApiPostPath,
  S extends keyof ApiPostRequestResponses<P>
>(
  path: P,
  urlParams: { [key: string]: string },
  queryParams: { [key: string]: string },
  body: ApiPostRequestPayload<P>,
  statusCode: S
): Promise<ApiPostRequestResponses<P>[S]> {
  const url = replaceAndAppendParamsInUrl(path, urlParams, queryParams);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    throw new Error(`POST ${url} failed with: ${error.message}`);
  }
  if (res.status !== statusCode) {
    if (onUnauthorized.callback && res.status === 401) {
      let code: "UNAUTHORIZED" | "PASSWORD_CHANGE_REQUIRED" = "UNAUTHORIZED";
      try {
        const data = await res.json();
        if (data.error.message === "password change required") {
          code = "PASSWORD_CHANGE_REQUIRED";
        }
      } catch (error) {
        // do nothing
      }
      const promise = onUnauthorized.callback(code).then(() => {
        return post(path, urlParams, queryParams, body, statusCode);
      });
      if (code === "UNAUTHORIZED") {
        onUnauthorized.callback = undefined;
      }
      return promise;
    }
    throw new ErrorWithResponse(
      `POST ${url} failed with status code ${res.status}`,
      res
    );
  }
  const data = res.status === 204 ? undefined : await res.json();
  return data as ApiPostRequestResponses<P>[S];
}

export async function del<
  P extends ApiDeletePath,
  S extends keyof ApiDeleteRequestResponses<P>
>(
  path: P,
  urlParams: { [key: string]: string },
  queryParams: { [key: string]: string },
  statusCode: S
): Promise<ApiDeleteRequestResponses<P>[S]> {
  const url = replaceAndAppendParamsInUrl(path, urlParams, queryParams);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
    });
  } catch (error) {
    throw new Error(`DELETE ${url} failed with: ${error.message}`);
  }
  if (res.status !== statusCode) {
    if (onUnauthorized.callback && res.status === 401) {
      let code: "UNAUTHORIZED" | "PASSWORD_CHANGE_REQUIRED" = "UNAUTHORIZED";
      try {
        const data = await res.json();
        if (data.error.message === "password change required") {
          code = "PASSWORD_CHANGE_REQUIRED";
        }
      } catch (error) {
        // do nothing
      }
      const promise = onUnauthorized.callback(code).then(() => {
        return del(path, urlParams, queryParams, statusCode);
      });
      if (code === "UNAUTHORIZED") {
        onUnauthorized.callback = undefined;
      }
      return promise;
    }
    throw new ErrorWithResponse(
      `DELETE ${url} failed with status code ${res.status}`,
      res
    );
  }
}
