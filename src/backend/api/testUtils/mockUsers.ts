import { jest } from "@jest/globals";
import Users from "../models/Users";

jest.mock("../models/Users");

export const mockUsers = () => {
  const mockedUsers = jest.mocked(Users);

  afterEach(() => {
    jest.resetAllMocks();
  });

  return mockedUsers;
};
