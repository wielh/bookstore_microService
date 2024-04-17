

import {rabbitMQconnect, rabbitMQConnection, channelName, transporter ,websiteEmail, infoLogger, errorLogger, Port, setElasticIndex} from '../common/config.js' 


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
    let message:any
    try {
        channel.consume(channelName,
            async (msg) => {
                message = msg
                infoLogger("micro-mail-service", "sendEmail", "" , `${message}`);
                if (msg !== null) {
                    const emailMessage = JSON.parse(msg.content.toString())
                    const {emailAddress, subject, message} = emailMessage
                    await sendMailImplementation(emailAddress, subject, message)
                }
            }, options
        );
    } catch (error) {
        errorLogger("micro-mail-service", "sendEmail", "An error happens while consuming message from rabbitMQ" , `${message}` , error);
    }
}

function sendVerificationMail() {
    sendEmail(channelName.getVerificationCode)
}

setElasticIndex("micro-mail")
infoLogger("micro-mail-service", "main", `Server run on port: ${Port.microMail}`, "")
await rabbitMQconnect()
const channel = await rabbitMQConnection.createChannel()
await channel.assertQueue(channelName.getVerificationCode, { durable: true});
sendVerificationMail()