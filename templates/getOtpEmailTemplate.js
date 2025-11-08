const Mailgen = require("mailgen");

const getOtpEmailTemplate = (otp, firstName = "") => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Peer Plus",
      link: "https://peerplus.com",
      copyright: "© 2025 Peer Plus. All rights reserved.",
    },
  });

  const emailBody = {
    body: {
      name: firstName ? firstName : "User",
      intro:
        "We’ve received a request to verify your Peer Plus account. Please use the following One-Time Password (OTP) to complete your verification:",
      table: {
        data: [
          {
            "Your OTP Code": otp,
            Validity: "2 minutes",
          },
        ],
        columns: {
          customWidth: { "Your OTP Code": "50%", Validity: "50%" },
          customAlignment: { "Your OTP Code": "center", Validity: "center" },
        },
      },
      action: {
        instructions:
          "Enter this OTP in the app or website to complete your verification.",
        button: {
          color: "#667eea",
          text: "Verify My Account",
          link: "https://peerplus.com/verify",
        },
      },
      outro:
        "This OTP is confidential. Do not share it with anyone. If you did not request this code, please ignore this email or contact our support team immediately.",
    },
  };

  return mailGenerator.generate(emailBody);
};

module.exports = getOtpEmailTemplate;
