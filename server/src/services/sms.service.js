// Sends OTP codes by SMS.
//
// TODO: no SMS provider has been chosen yet (e.g. MSG91, Fast2SMS or Twilio).
// Until then, mobile OTPs only work with OTP_DEV_MODE=true, where the code is
// printed in the server console and this function is never called.
import { ApiError } from "../utils/ApiError.js";

export async function sendOtpSms(_phone, _code, _purpose) {
  throw new ApiError(503, "SMS codes are not available yet. Please try again later.");
}
