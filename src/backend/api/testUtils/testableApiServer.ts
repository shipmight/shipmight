import { Application } from "express";
import apiServer from "../apiServer";
import { Response, Test } from "supertest";
import { signBearerToken } from "../jwt";

export const testableApiServer = () => {
  let api: Application;

  const testWithAuthToken = (
    message: string,
    doTest: (
      req: (asd: Test) => Promise<Response>,
      meUsername?: string
    ) => Promise<void>,
    options: { skip: "reset-password-check"[] } = { skip: [] }
  ) => {
    it(`${message}: requires jwt`, async () => {
      let error: unknown;
      try {
        await doTest(async (req) => {
          try {
            const response = await req.expect(401);
            return response;
          } catch (asd) {
            error = asd;
          }
        });
      } catch (error) {
        // Disregard errors from actual test assertions
      }
      if (error) {
        throw error;
      }
    });

    it(`${message}: requires real jwt`, async () => {
      let error: unknown;
      try {
        await doTest(async (req) => {
          try {
            const response = await req
              .set("authorization", "Bearer invalid-token")
              .expect(401);
            return response;
          } catch (asd) {
            error = asd;
          }
        });
      } catch (error) {
        // Disregard errors from actual test assertions
      }
      if (error) {
        throw error;
      }
    });

    it(`${message}: requires signed jwt`, async () => {
      const token = signBearerToken({ username: "user-1" });
      // Slightly mess up the beginning of the payload-section
      const malformed = token.replace(/\./, ".MALFORMED");

      let error: unknown;
      try {
        await doTest(async (req) => {
          try {
            const response = await req
              .set("authorization", `Bearer ${malformed}`)
              .expect(401);
            return response;
          } catch (asd) {
            error = asd;
          }
        });
      } catch (error) {
        // Disregard errors from actual test assertions
      }
      if (error) {
        throw error;
      }
    });

    it(`${message}: requires non-expired jwt`, async () => {
      const expiry = Math.floor(Date.now() / 1000) - 60000;
      const token = signBearerToken({ username: "user-1" }, expiry);

      let error: unknown;
      try {
        await doTest(async (req) => {
          try {
            const response = await req
              .set("authorization", `Bearer ${token}`)
              .expect(401);
            return response;
          } catch (asd) {
            error = asd;
          }
        });
      } catch (error) {
        // Disregard errors from actual test assertions
      }
      if (error) {
        throw error;
      }
    });

    if (!options.skip.includes("reset-password-check")) {
      it(`${message}: blocks user who needs to change their password`, async () => {
        const token = signBearerToken({
          username: "user-1",
          mustChangePassword: true,
        });

        let error: unknown;
        try {
          await doTest(async (req) => {
            try {
              const response = await req
                .set("authorization", `Bearer ${token}`)
                .expect(401);
              return response;
            } catch (asd) {
              error = asd;
            }
          });
        } catch (error) {
          // Disregard errors from actual test assertions
        }
        if (error) {
          throw error;
        }
      });
    }

    it(`${message}`, async () => {
      const meUsername = "test-user";

      const token = signBearerToken({
        username: meUsername,
      });

      await doTest(
        async (req) => req.set("authorization", `Bearer ${token}`),
        meUsername
      );
    });
  };

  const testNameValidation = (
    message: string,
    doTest: (
      name: string,
      req: (asd: Test) => Promise<Response>
    ) => Promise<Response>
  ) => {
    const validNames = [
      "a",
      "example",
      "hey there",
      "Hey there!",
      "app 123",
      "123 app",
      "app (new: use this)",
    ];

    const invalidNames = ["", " ", " example", "example ", "a".repeat(31)];

    const token = signBearerToken({
      username: "user-1",
    });

    for (const name of validNames) {
      it(`${message}: passes ${JSON.stringify(name)}`, async () => {
        const response = await doTest(name, async (req) =>
          req.set("authorization", `Bearer ${token}`)
        );

        expect(response.status).toEqual(201);
      });
    }

    for (const name of invalidNames) {
      it(`${message}: blocks ${JSON.stringify(name)}`, async () => {
        const response = await doTest(name, async (req) =>
          req.set("authorization", `Bearer ${token}`)
        );

        expect(response.status).toEqual(400);
        expect(response.body).toMatchObject({
          error: {
            errors: expect.arrayContaining([
              expect.objectContaining({ path: ".body.name" }),
            ]),
            name: "Bad Request",
          },
        });
      });
    }
  };

  const obj = {
    api,
    testWithAuthToken,
    testNameValidation,
  };

  beforeAll(async () => {
    obj.api = apiServer();
  });

  return obj;
};
