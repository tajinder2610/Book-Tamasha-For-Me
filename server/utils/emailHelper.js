const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { RESEND_API_KEY } = process.env;
const API_URL = "https://api.resend.com/emails";

function replaceContent(content, data) {
  const keys = Object.keys(data || {});
  keys.forEach((key) => {
    content = content.replace(`#{${key}}`, data[key]);
  });
  return content;
}

async function emailHelper(templateName, receiverEmail, data) {
  try {
    const templatePath = path.join(__dirname, "email_templates", templateName);
    let content = await fs.promises.readFile(templatePath, "utf-8");
    content = replaceContent(content, data);

    const emailDetails = {
      from: '"Book Tamasha For Me" <onboarding@resend.dev>',
      // Resend sandbox restriction: send only to this verified mailbox.
      to: "tajinderpalsingh26@gmail.com",
      subject: templateName === "ticket.html" ? "Your Booking Ticket" : "Reset Password OTP",
      text: "Please view this email in HTML mode.",
      html: content,
    };

    const response = await axios.post(API_URL, emailDetails, {
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log("email sent", {
      template: templateName,
      requestedReceiver: receiverEmail,
      actualReceiver: emailDetails.to,
      resendId: response?.data?.id,
    });
  } catch (err) {
    console.log("emailHelper error:", {
      message: err.message,
      response: err?.response?.data,
      status: err?.response?.status,
    });
    throw err;
  }
}

module.exports = emailHelper;
