import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

let app;
let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = "vitest-jwt-secret-key-minimum-32-characters-long";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  const mod = await import("../src/app.js");
  app = mod.default;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  const cols = mongoose.connection.collections;
  await Promise.all(
    Object.values(cols).map((c) => c.deleteMany({})),
  );
});

describe("API routes", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST /api/auth/register returns token and user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "runner@test.dev", password: "securepass1" })
      .expect(200);

    expect(res.body.token).toBeTruthy();
    expect(res.body.user?.email).toBe("runner@test.dev");
  });

  it("POST /api/auth/login returns 401 for wrong password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "coach@test.dev", password: "correcthorse1" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "coach@test.dev", password: "wrongpassword" })
      .expect(401);

    expect(res.body.error).toBeTruthy();
  });

  it("POST /api/workouts returns 401 without Authorization", async () => {
    const res = await request(app)
      .post("/api/workouts")
      .send({
        date: new Date().toISOString(),
        type: "easy",
        distanceMeters: 1609,
        durationSeconds: 600,
      })
      .expect(401);

    expect(res.body.error).toBeTruthy();
  });

  it("POST /api/workouts creates workout with Bearer token", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "athlete@test.dev", password: "anothergood1" })
      .expect(200);

    const token = reg.body.token;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: new Date().toISOString(),
        type: "easy",
        distanceMeters: 5000,
        durationSeconds: 1800,
        title: "Morning run",
      })
      .expect(201);

    expect(res.body.workout?._id).toBeTruthy();
    expect(res.body.workout.distanceMeters).toBe(5000);
  });
});
