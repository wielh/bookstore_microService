import {AccountServiceClient} from '../proto/account.js'
import {BookServiceClient} from '../proto/book.js'
import {TransectionServiceClient} from '../proto/transection.js'
import  {createLogger,transports,format} from 'winston'
import {credentials} from '@grpc/grpc-js'
import {connect} from 'amqplib'
import {createTransport} from 'nodemailer'
import mongoose from 'mongoose'
import { google } from "googleapis";

export const logger = createLogger({
    level: 'info',
    format: format.json(),
    transports: [new transports.Console()],
});

export const hashSalt:string = "qwertasdfgzxcvb"
export const tokenKey:string = "abcdefghijklmnopqrstuvwxyz"
export const tokenExpireSecond: number = 24*60*60

export const IP = "127.0.0.1"
export const gatePort: number = 3000
export const basicUrl = `${IP}:${gatePort}`

const accountServicePort = 9501
export const accountServiceIP = `${IP}:${accountServicePort}`
export const accountServiceClient = new AccountServiceClient(accountServiceIP,credentials.createInsecure())

const bookServicePort = 9502
export const bookServiceIP = `${IP}:${bookServicePort}`
export const bookServiceClient = new BookServiceClient(bookServiceIP,credentials.createInsecure())

const transectionServicePort = 9503
export const transectionServiceIP = `${IP}:${transectionServicePort}`
export const transectionServiceClient = new TransectionServiceClient(transectionServiceIP,credentials.createInsecure())


const mongoIP =`mongodb://127.0.0.1:27017/bookstore`   
export async function mongooseConnection() {
    mongoose.connect(mongoIP)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

}

const rabbitMQPort = 5672
const rabbitMQUsername = 'root';
const rabbitMQPassword = '1234';
const rabbitMQServer = 'localhost' // <docker container name> rabbitmq or localhost
const rabbitMQURL = `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQServer}:${rabbitMQPort}/`;
export const rabbitMQConnection = await connect(rabbitMQURL);
export enum channelName { getVerificationCode = "getVerificationCode"}

export const googleVerifyID = "118619557524-ej7k7ceopnn8glgi9foksta3t72vnca3.apps.googleusercontent.com"
export const googleVerifyPassword = "*****"
export const googleCallbackUrl =  "http://"+ basicUrl + "/account/google_callback"
export const oauth2Client = new google.auth.OAuth2(googleVerifyID,googleVerifyPassword,googleCallbackUrl)
export const websiteEmail = 'wielh.erlow@gmail.com'
export const transporter = createTransport(
    {  
        service: 'gmail',
        port: 465,
        secure: true,
        auth: {
            user: websiteEmail,
            pass:"*****"
        },
        tls: {
            rejectUnauthorized: false
        }
    }
);
export const googleVerificationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ["email","profile"],
    include_granted_scopes: true
});
console.log(googleVerificationUrl)

export enum accountType{normal=0,google=1}