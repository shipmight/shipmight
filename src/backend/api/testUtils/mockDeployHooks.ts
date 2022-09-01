import { jest } from "@jest/globals";
import DeployHooks from "../models/DeployHooks";

jest.mock("../models/DeployHooks");

export const mockDeployHooks = () => {
  const mockedDeployHooks = jest.mocked(DeployHooks);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedDeployHooks;
};
