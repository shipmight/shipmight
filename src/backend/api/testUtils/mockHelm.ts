import { jest } from "@jest/globals";
import * as helm from "../../utils/helm";

jest.mock("../../utils/helm");

export const mockHelm = () => {
  const mockedHelm = jest.mocked(helm);

  afterAll(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedHelm;
};
