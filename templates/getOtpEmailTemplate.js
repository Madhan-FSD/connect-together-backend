import  Mailgen from 'mailgen'
import {
  EMAIL_PRODUCT,
  EMAIL_THEME,
  OTP_EMAIL,
} from "../constants/email.constants.js";

const getOtpEmailTemplate = (otp, firstName = "") => {
  const mailGenerator = new Mailgen({
    theme: EMAIL_THEME,
    product: {
      name: EMAIL_PRODUCT.NAME,
      link: EMAIL_PRODUCT.LINK,
      copyright: EMAIL_PRODUCT.COPYRIGHT,
    },
  });

  const emailBody = {
    body: {
      name: firstName || OTP_EMAIL.DEFAULT_USER_NAME,
      intro: OTP_EMAIL.INTRO,
      table: {
        data: [
          {
            [OTP_EMAIL.TABLE_LABELS.OTP_CODE]: otp,
            [OTP_EMAIL.TABLE_LABELS.VALIDITY]: OTP_EMAIL.VALIDITY,
          },
        ],
        columns: {
          customWidth: {
            [OTP_EMAIL.TABLE_LABELS.OTP_CODE]: "50%",
            [OTP_EMAIL.TABLE_LABELS.VALIDITY]: "50%",
          },
          customAlignment: {
            [OTP_EMAIL.TABLE_LABELS.OTP_CODE]: "center",
            [OTP_EMAIL.TABLE_LABELS.VALIDITY]: "center",
          },
        },
      },
      action: {
        instructions: OTP_EMAIL.INSTRUCTIONS,
        button: {
          color: OTP_EMAIL.BUTTON_COLOR,
          text: OTP_EMAIL.BUTTON_TEXT,
          link: OTP_EMAIL.VERIFY_LINK,
        },
      },
      outro: OTP_EMAIL.OUTRO,
    },
  };

  return mailGenerator.generate(emailBody);
};

export default getOtpEmailTemplate;

