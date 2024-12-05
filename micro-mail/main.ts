

import {infoLogger, errorLogger, setElasticIndex, rabbitMQconnect,getRabbitMQConnection} from "../common/utils.js"
import {createTransport} from 'nodemailer'
import {GlobalConfig} from '../common/init.js'

export async function sendMailImplementation(emailAddress:string, subject:string, message:string): Promise<boolean>{
    try {
        await transporter.sendMail(
            {
                from: GlobalConfig.googleOauth2.websiteEmail,
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
    sendEmail(GlobalConfig.rabbitMQ.ChannelName.getVerificationCode)
}

var transporter = createTransport(
    {  
        host: "smtp.gmail.com",
        service: 'gmail',
        port: GlobalConfig.microMail.sendMailport,
        secure: true,
        auth: {
            user: GlobalConfig.googleOauth2.websiteEmail,
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
const channel = await getRabbitMQConnection().createChannel()
await channel.assertQueue(GlobalConfig.rabbitMQ.ChannelName.getVerificationCode, { durable: true});
sendVerificationMail()