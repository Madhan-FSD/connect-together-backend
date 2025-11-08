import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMALLER_EMAIL,
    pass: process.env.NODEMALLER_PASSWORD,
  },
});

const sendOtpEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `Peer Plus${process.env.NODEMALLER_EMAIL}`,
      to,
      subject,
      html,
    });
    // console.log("send mail to ", to);
  } catch (error) {
    console.log("nodemailer giving an error");
  }
};

export default sendOtpEmail;
