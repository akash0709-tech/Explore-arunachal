import { signupSchema } from "../src/validators/auth.validator.js";

const signupDetails = {
  name: "Akash Sah",
  email: "akash@example.com",
  phone: "+91 82526 73593",
  password: "example123",
  role: "traveller",
  acceptedTerms: true
};

describe("signupSchema", () => {
  it("accepts required email and mobile fields without verification tokens", () => {
    const result = signupSchema.safeParse(signupDetails);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      email: "akash@example.com",
      phone: "8252673593"
    });
  });

  it("still requires a valid email address and mobile number", () => {
    const result = signupSchema.safeParse({
      ...signupDetails,
      email: "",
      phone: "123"
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(["email", "phone"])
    );
  });
});
