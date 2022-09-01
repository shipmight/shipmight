import { jest } from "@jest/globals";
import AppCharts from "../models/AppCharts";

jest.mock("../models/AppCharts");

export const mockAppCharts = () => {
  const mockedAppCharts = jest.mocked(AppCharts);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedAppCharts;
};
