import crypto from "crypto";

export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
};

export const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
};

export const getTokenExpiry = (minutes = 1440) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};
