
import {createTransport} from 'nodemailer'
import {rabbitMQConnection, channelName} from '../common/config.js' 

const channel = await rabbitMQConnection.createChannel()
await channel.assertQueue(channelName.getVerificationCode, { durable: true });
await channel.assertQueue(channelName.getVerificationCode, { durable: true });

export const websiteEmail = 'wielh.erlow@gmail.com'
export const transporter = createTransport(
    {
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
            user: websiteEmail,
            pass: '***',
        },
        tls: {
            rejectUnauthorized: false
        }
    }
);

// ref: https://blog.hungwin.com.tw/aspnet-google-login/
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

function sendEmail(channelName:string) {
    try {
        const options = { noAck: true };
        for (let i=0;i<1000;i++) {
            channel.consume(channelName,
                async (message) => {
                    if (message !== null) {
                        const emailMessage = JSON.parse(message.content.toString())
                        await sendMailImplementation(emailMessage["emailAddress"], emailMessage["subject"] , emailMessage["message"])
                    }
                },options
            );
        }
    } catch (error) {
        console.error(error);
    }
}

function sendVerificationMail() {
    sendEmail(channelName.getVerificationCode)
}

setInterval(sendVerificationMail,1*1000)