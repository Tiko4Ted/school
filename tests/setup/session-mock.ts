import { vi } from "vitest";
import { getTestSession } from "../utils/session";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");

  return {
    ...actual,
    getAuthSession: async () => getTestSession(),
  };
});
