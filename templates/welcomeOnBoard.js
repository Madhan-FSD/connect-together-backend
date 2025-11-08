const Mailgen = require("mailgen");

const getWelcomeEmailTemplate = (firstName, email) => {
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
      name: firstName,
      intro: "Welcome to Peer Plus! We’re thrilled to have you on board.",
      table: {
        data: [
          {
            "Account Name": firstName,
            "Registered Email": email,
          },
        ],
        columns: {
          customWidth: { "Account Name": "50%", "Registered Email": "50%" },
          customAlignment: {
            "Account Name": "left",
            "Registered Email": "left",
          },
        },
      },
      action: {
        instructions:
          "To start exploring your Peer Plus account and connect with peers, click the button below:",
        button: {
          color: "#667eea",
          text: "Get Started Now",
          link: "https://peerplus.com/dashboard",
        },
      },
      outro:
        "Need help or have any questions? Just reply to this email — our support team is here to assist you anytime.",
    },
  };

  const emailTemplate = mailGenerator.generate(emailBody);

  return emailTemplate;
};

module.exports = getWelcomeEmailTemplate;
