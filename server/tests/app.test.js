// Basic checks for the foundation: health check, 404 and the error shape.
// These do not need a database connection.
import request from "supertest";
import app from "../src/app.js";

describe("Foundation", () => {
  it("GET /api/health returns success true", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("uptimeSeconds");
    expect(res.body.data).toHaveProperty("database");
  });

  it("unknown route returns a clean 404 JSON", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, errors: [] });
    expect(res.body.message).toMatch(/Route not found/);
  });

  it("invalid JSON body returns 400", async () => {
    const res = await request(app)
      .post("/api/trips")
      .set("Content-Type", "application/json")
      .send("{ bad json");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
