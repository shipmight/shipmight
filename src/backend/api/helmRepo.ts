import { load } from "js-yaml";
import request, { CoreOptions, Response } from "request";

//
// HTTP client
//

const client = request.defaults({});

function makeRequest(url: string, options?: CoreOptions): Promise<Response> {
  return new Promise((resolve, reject) => {
    client(url, options, (err, response) => {
      if (err) {
        return reject(err);
      }
      resolve(response);
    });
  });
}

//
// Types
//

interface RepositoryIndex {
  entries: {
    [chartName: string]: {
      kubeVersion: string;
      version: string;
      name: string;
      urls: string[];
    }[];
  };
}

//
// Functions
//

export const getRepositoryIndex = async (
  repositoryUrl: string,
  chartNames?: string[]
): Promise<RepositoryIndex> => {
  const yamlContent = await makeRequest("index.yaml", {
    baseUrl: repositoryUrl,
  });
  // Cast as RepositoryIndex and read optimistically
  const data = load(yamlContent.body) as RepositoryIndex;
  const returnValue: RepositoryIndex = {
    entries: {},
  };
  for (const chartName of Object.keys(data.entries)) {
    if (typeof chartNames !== "undefined" && !chartNames.includes(chartName)) {
      continue;
    }
    returnValue.entries[chartName] = data.entries[chartName].map((entry) => {
      return {
        kubeVersion: entry.kubeVersion.toString(),
        version: entry.version.toString(),
        name: entry.name.toString(),
        urls: entry.urls.map((url) => url.toString()),
      };
    });
  }
  return returnValue;
};
