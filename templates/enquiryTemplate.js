const Mailgen = require("mailgen");

const getEnquiryEmailTemplate = (data) => {
  const { institutionName, userName, userEmail, userPhone, message } = data;

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
      title: `New Enquiry for ${institutionName}`,
      intro: `Hello Admin, you have received a new enquiry for <b>${institutionName}</b> from ${userName}.`,
      table: {
        data: [
          {
            "User Name": userName,
            "User Email": userEmail,
            "User Phone": userPhone || "N/A",
            "Enquiry Message": message || "No message provided",
          },
        ],
        columns: {
          customWidth: {
            "User Name": "100%",
            "User Email": "100%",
            "User Phone": "100%",
            "Enquiry Message": "100%",
          },
          customAlignment: {
            "User Name": "left",
            "User Email": "left",
            "User Phone": "left",
            "Enquiry Message": "left",
          },
        },
      },
      action: {
        instructions: `To view and respond to this enquiry, click the button below:`,
        button: {
          color: "#667eea",
          text: "View Enquiry Dashboard",
          link: "https://peerplus.com/admin/enquiries",
        },
      },
      outro:
        "Thank you for using Peer Plus. Stay connected and empower education together!",
    },
  };

  const emailTemplate = mailGenerator.generate(emailBody);

  return emailTemplate;
};

module.exports = getEnquiryEmailTemplate;
