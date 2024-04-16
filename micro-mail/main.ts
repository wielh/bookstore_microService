

import {rabbitMQconnect, rabbitMQConnection, channelName, transporter ,websiteEmail, logger} from '../common/config.js' 


export async function sendMailImplementation(emailAddress:string, subject:string, message:string): Promise<boolean>{
    try {
        await transporter.sendMail(
            {
                from: websiteEmail,
                to: emailAddress,
                subject: subject,
                html: message,
            }
        )
    } catch (error) {
        return false;
    }
    return true
}

const options = { noAck: true };
function sendEmail(channelName:string) {
    try {
        channel.consume(channelName,
            async (msg) => {
                logger.info("A new email message", msg)
                if (msg !== null) {
                    const emailMessage = JSON.parse(msg.content.toString())
                    const {emailAddress, subject, message} = emailMessage
                    await sendMailImplementation(emailAddress, subject, message)
                }
            }, options
        );
    } catch (error) {
        logger.error(error);
    }
}

function sendVerificationMail() {
    sendEmail(channelName.getVerificationCode)
}

console.log("Hello, this is micro-mail")
await rabbitMQconnect()
const channel = await rabbitMQConnection.createChannel()
await channel.assertQueue(channelName.getVerificationCode, { durable: true});
sendVerificationMail()