

import {rabbitMQConnection, channelName, transporter ,websiteEmail} from '../common/config.js' 


export async function sendMailImplementation(emailAddress:string, subject:string, message:string): Promise<boolean>{
    try {
        let x = await transporter.sendMail(
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
                if (msg !== null) {
                    const emailMessage = JSON.parse(msg.content.toString())
                    console.log(emailMessage)
                    const {emailAddress, subject, message} = emailMessage
                    await sendMailImplementation(emailAddress, subject, message)
                }
            }, options
        );
    } catch (error) {
        console.error(error);
    }
}

function sendVerificationMail() {
    sendEmail(channelName.getVerificationCode)
}

console.log("Hello, this is micro-mail")
const conn = await rabbitMQConnection()
const channel = await conn.createChannel()
await channel.assertQueue(channelName.getVerificationCode, { durable: true});
sendVerificationMail()