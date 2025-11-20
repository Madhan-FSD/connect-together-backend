import Mailgen from "mailgen";
import {
  EMAIL_PRODUCT,
  EMAIL_THEME,
  WELCOME_EMAIL,
} from "../constants/email.constants.js";

const getWelcomeEmailTemplate = (firstName, email) => {
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
      name: firstName,
      intro: WELCOME_EMAIL.INTRO,
      table: {
        data: [
          {
            [WELCOME_EMAIL.TABLE_LABELS.ACCOUNT_NAME]: firstName,
            [WELCOME_EMAIL.TABLE_LABELS.REGISTERED_EMAIL]: email,
          },
        ],
        columns: {
          customWidth: {
            [WELCOME_EMAIL.TABLE_LABELS.ACCOUNT_NAME]: "50%",
            [WELCOME_EMAIL.TABLE_LABELS.REGISTERED_EMAIL]: "50%",
          },
          customAlignment: {
            [WELCOME_EMAIL.TABLE_LABELS.ACCOUNT_NAME]: "left",
            [WELCOME_EMAIL.TABLE_LABELS.REGISTERED_EMAIL]: "left",
          },
        },
      },
      action: {
        instructions: WELCOME_EMAIL.INSTRUCTIONS,
        button: {
          color: WELCOME_EMAIL.BUTTON_COLOR,
          text: WELCOME_EMAIL.BUTTON_TEXT,
          link: WELCOME_EMAIL.DASHBOARD_LINK,
        },
      },
      outro: WELCOME_EMAIL.OUTRO,
    },
  };

  const emailTemplate = mailGenerator.generate(emailBody);

  return emailTemplate;
};

export default getWelcomeEmailTemplate;
