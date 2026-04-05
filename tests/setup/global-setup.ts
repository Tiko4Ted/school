import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { GenericContainer, Wait } from "testcontainers";

export default async function globalSetup() {
  const container = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "postgres",
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_DB: "schoolms",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const schema = `test_${randomUUID().replace(/-/g, "")}`;
  const connectionUri = `postgresql://postgres:postgres@${host}:${port}/schoolms?schema=${schema}`;

  process.env.DATABASE_URL = connectionUri;
  process.env.TEST_DATABASE_URL = connectionUri;

  const schemaPath = path.resolve("prisma/schema.prisma");
  execSync(`npx prisma db push --skip-generate --schema "${schemaPath}"`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: connectionUri,
    },
  });

  return async () => {
    await container.stop();
  };
}
