import { jest } from "@jest/globals";
import * as kubernetes from "../../utils/kubernetes";

jest.mock("../../utils/kubernetes");

export const mockKubernetes = () => {
  const mocked = jest.mocked(kubernetes);

  afterAll(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mocked;
};
