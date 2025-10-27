import Mailgen from "mailgen";
import nodemailer from "nodemailer";

/**
 * Sends an email using Nodemailer + Mailgen (Mailtrap test env recommended)
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Subject line
 * @param {Object} options.mailgenContent - Mailgen content object
 */
const sendEmail = async (options) => {
  try {
    // ✅ Create mail template generator
    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "Task Manager",
        link: "https://taskmanagerlink.com",
      },
    });

    // ✅ Generate both text and HTML content
    const emailTextual = mailGenerator.generatePlaintext(
      options.mailgenContent,
    );
    const emailHtml = mailGenerator.generate(options.mailgenContent);

    // ✅ Create transporter with correct Mailtrap config
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_TRAP_SMTP_HOST,
      port: Number(process.env.MAIL_TRAP_SMTP_PORT), // ensure it's a number
      auth: {
        user: process.env.MAIL_TRAP_SMTP_USER,
        pass: process.env.MAIL_TRAP_SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: "Task Manager <mail.taskmanager@example.com>",
      to: options.email,
      subject: options.subject,
      text: emailTextual,
      html: emailHtml,
    };

    // ✅ Use sendMail (not sendEmail) and wrap in timeout to prevent hanging
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise(
      (_, reject) =>
        setTimeout(() => reject(new Error("Email sending timed out")), 8000), // 8s limit
    );

    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`📨 Email successfully sent to ${options.email}`);
  } catch (error) {
    console.error("❌ Email service failed:");
    console.error(error.message);
  }
};

/**
 * Generates Mailgen content for email verification
 */
const emailVerificationMailgenContent = (username, verificationUrl) => ({
  body: {
    name: username,
    intro: "Welcome to our app! We're excited to have you on board.",
    action: {
      instructions: "To verify your email, please click the button below:",
      button: {
        color: "#22BC66",
        text: "Verify your email",
        link: verificationUrl,
      },
    },
    outro:
      "Need help or have questions? Just reply to this email — we'd love to help.",
  },
});

/**
 * Generates Mailgen content for forgot password emails
 */
const forgotPasswordMailgenContent = (username, passwordResetUrl) => ({
  body: {
    name: username,
    intro: "We received a request to reset your account password.",
    action: {
      instructions: "Click the button below to reset your password:",
      button: {
        color: "#FF0000",
        text: "Reset Password",
        link: passwordResetUrl,
      },
    },
    outro:
      "If you didn’t request this, no action is needed. Your account remains secure.",
  },
});

export {
  forgotPasswordMailgenContent,
  emailVerificationMailgenContent,
  sendEmail,
};
