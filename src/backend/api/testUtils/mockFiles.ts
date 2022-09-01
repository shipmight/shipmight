import { jest } from "@jest/globals";
import Files from "../models/Files";

jest.mock("../models/Files");

export const mockFiles = () => {
  const mockedFiles = jest.mocked(Files);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedFiles;
};
