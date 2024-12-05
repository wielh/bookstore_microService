

import {infoLogger, errorLogger, setElasticIndex} from "../common/utils.js"
import {createTransport} from 'nodemailer'
import {GlobalConfig} from '../common/init.js'

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
                infoLogger("micro-mail-service", "" , `${message}`);
                if (msg !== null) {
                    const emailMessage = JSON.parse(msg.content.toString())
                    const {emailAddress, subject, message} = emailMessage
                    await sendMailImplementation(emailAddress, subject, message)
                }
            }, options
        );
    } catch (error) {
        errorLogger("micro-mail-service", "An error happens while consuming message from rabbitMQ" , `${message}` , error);
    }
}

function sendVerificationMail() {
    sendEmail(channelName.getVerificationCode)
}

var transporter = createTransport(
    {  
        service: 'gmail',
        port: Port.sendMail,
        secure: true,
        auth: {
            user: websiteEmail,
            pass:"***"
        },
        tls: {
            rejectUnauthorized: false
        }
    }
);
setElasticIndex("micro-mail")
infoLogger("micro-mail-service", `Server run on port: ${GlobalConfig.microMail.url.port}`, "")
await rabbitMQconnect()
const channel = await rabbitMQConnection.createChannel()
await channel.assertQueue(channelName.getVerificationCode, { durable: true});
sendVerificationMail()