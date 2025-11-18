const Mailgen = require("mailgen");

const getEnquiryStatusEmailTemplate = (data) => {
  const { userName, institutionName, message, status } = data;

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Peer Plus",
      link: "https://peerplus.com",
      copyright: "© 2025 Peer Plus. All rights reserved.",
    },
  });

  const statusMessage =
    status === "accepted"
      ? "Your enquiry has been accepted! 🎉 We’ll reach out to you soon."
      : status === "rejected"
      ? "Unfortunately, your enquiry has been rejected."
      : status === "closed"
      ? "Your enquiry has been closed. Thank you for reaching out!"
      : "Your enquiry is under review.";

  const emailBody = {
    body: {
      name: userName,
      intro: `Status update for your enquiry to <b>${institutionName}</b>.`,
      table: {
        data: [
          {
            Institution: institutionName,
            "Your Message": message || "N/A",
            "Current Status": status.toUpperCase(),
          },
        ],
      },
      action: {
        instructions: statusMessage,
        button: {
          color:
            status === "accepted"
              ? "#22BC66"
              : status === "rejected"
              ? "#E53E3E"
              : "#667EEA",
          text: "View Enquiry Details",
          link: "https://peerplus.com/user/enquiries",
        },
      },
      outro:
        "Thank you for using Peer Plus. We appreciate your interest and support!",
    },
  };

  return mailGenerator.generate(emailBody);
};

module.exports = getEnquiryStatusEmailTemplate;
