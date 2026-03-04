import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
const isMock = !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER;

let client;
if (!isMock) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function sendOtp(phone, code) {
  if (isMock) {
    console.log(`\n📱 [MOCK SMS] OTP for ${phone}: ${code}\n`);
    return { sent: true, mock: true };
  }

  await client.messages.create({
    body: `Your Family Shield code is: ${code}`,
    from: TWILIO_PHONE_NUMBER,
    to: phone,
  });
  return { sent: true, mock: false };
}
