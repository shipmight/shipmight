import { jest } from "@jest/globals";
import Projects from "../models/Projects";

jest.mock("../models/Projects");

export const mockProjects = () => {
  const mockedProjects = jest.mocked(Projects);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedProjects;
};
