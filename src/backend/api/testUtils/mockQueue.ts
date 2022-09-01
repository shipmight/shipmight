import { jest } from "@jest/globals";
import queue from "../queue";

jest.mock("../queue");

export const mockQueue = () => {
  const mockedQueue = jest.mocked(queue);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedQueue;
};
