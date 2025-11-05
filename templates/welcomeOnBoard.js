const getWelcomeEmailTemplate = (firstName, email) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Peer Plus</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Header with Celebration -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center; position: relative;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 1px;">
                                PEER PLUS
                            </h1>
                            <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 300; opacity: 0.95;">
                                Welcome Aboard!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 28px; font-weight: 600;">
                                Welcome to Peer Plus, ${firstName}! 🚀
                            </h2>
                            
                            <p style="margin: 0 0 25px 0; color: #666666; font-size: 16px; line-height: 1.7;">
                                Congratulations! Your account has been successfully created. We're thrilled to have you join our community.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.7;">
                                You're now part of a platform designed to help you connect, collaborate, and grow with peers from around the world.
                            </p>
                            
                            <!-- Account Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fb; border-radius: 10px; border: 2px solid #e5e7eb; margin: 30px 0;">
                                <tr>
                                    <td style="padding: 25px 30px;">
                                        <p style="margin: 0 0 15px 0; color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            Your Account Details
                                        </p>
                                        <p style="margin: 0 0 10px 0; color: #333333; font-size: 16px;">
                                            <strong>Name:</strong> ${firstName}
                                        </p>
                                        <p style="margin: 0; color: #333333; font-size: 16px;">
                                            <strong>Email:</strong> ${email}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- What's Next Section -->
                            <h3 style="margin: 40px 0 20px 0; color: #333333; font-size: 20px; font-weight: 600;">
                                What's Next? ✨
                            </h3>
                            
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 15px 0;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width: 40px; vertical-align: top;">
                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 16px;">1</div>
                                                </td>
                                                <td style="padding-left: 15px;">
                                                    <p style="margin: 0 0 5px 0; color: #333333; font-size: 16px; font-weight: 600;">
                                                        Complete Your Profile
                                                    </p>
                                                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                                        Add more details to help others connect with you
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 15px 0;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width: 40px; vertical-align: top;">
                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 16px;">2</div>
                                                </td>
                                                <td style="padding-left: 15px;">
                                                    <p style="margin: 0 0 5px 0; color: #333333; font-size: 16px; font-weight: 600;">
                                                        Explore Features
                                                    </p>
                                                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                                        Discover all the tools available to enhance your experience
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 15px 0;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width: 40px; vertical-align: top;">
                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 16px;">3</div>
                                                </td>
                                                <td style="padding-left: 15px;">
                                                    <p style="margin: 0 0 5px 0; color: #333333; font-size: 16px; font-weight: 600;">
                                                        Connect with Peers
                                                    </p>
                                                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                                        Start building meaningful connections today
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                                            Get Started Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.7;">
                                If you have any questions or need assistance, our support team is always here to help. Feel free to reach out anytime!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 15px 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
                                Thanks for choosing Peer Plus!<br>
                                <strong style="color: #667eea;">The Peer Plus Team</strong>
                            </p>
                            
                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.5; text-align: center;">
                                This email was sent to ${email}<br>
                                © 2025 Peer Plus. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

module.exports = getWelcomeEmailTemplate;
