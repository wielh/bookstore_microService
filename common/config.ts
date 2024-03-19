import {AccountServiceClient} from '../proto/account.js'
import {BookServiceClient} from '../proto/book.js'
import {TransectionServiceClient} from '../proto/transection.js'
import  {createLogger,transports,format} from 'winston'
import {credentials} from '@grpc/grpc-js'
import mongoose from 'mongoose';
import {connect} from 'amqplib'
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
export const transectionServiceClient = new TransectionServiceClient(bookServiceIP,credentials.createInsecure())

const mongoPort = 27017
const mongoIP =`mongodb://127.0.0.1:${mongoPort}`   
const dbName = 'bookstore'
mongoose.connect(`mongodb://${mongoIP}/${dbName}`)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

const rabbitMQPort = 5672
const rabbitMQUsername = 'root';
const rabbitMQPassword = '1234';
const rabbitMQServer = 'localhost' // <docker container name> rabbitmq or localhost
const rabbitMQURL = `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQServer}:${rabbitMQPort}/`;
export const rabbitMQConnection = await connect(rabbitMQURL);
export enum channelName { getVerificationCode = "getVerificationCode"}

export const googleVerifyID = "118619557524-26i4t5boire053d9pg59csddkf302tds.apps.googleusercontent.com"
export const googleVerifyPassword = "***"
export const googleCallbackUrl = basicUrl + "/account/google_callback"
export const Oauth2Client = new google.auth.OAuth2(googleVerifyID,googleVerifyPassword,googleCallbackUrl)