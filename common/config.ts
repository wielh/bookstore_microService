import {AccountServiceClient} from '../proto/account.js'
import {BookServiceClient} from '../proto/book.js'
import {TransectionServiceClient} from '../proto/transection.js'
import {getCurrentDatetime} from './utils.js'

import  {createLogger,Logger, transports,format} from 'winston'
import {credentials} from '@grpc/grpc-js'
import {connect, Connection} from 'amqplib'
import {createTransport} from 'nodemailer'
import mongoose from 'mongoose'
import {google}  from "googleapis";
import { OAuth2Client } from 'google-auth-library';
import { Client } from '@elastic/elasticsearch';
import { Timestamp } from 'mongodb'

let logger: Logger
export const hashSalt:string = "qwertasdfgzxcvb"
export const tokenKey:string = "abcdefghijklmnopqrstuvwxyz"
export const tokenExpireSecond: number = 24*60*60

export enum accountType {normal=0,google=1}
export enum Port { gate = 3000, microAccount = 9501, microBook=9502, microTransection = 9503, microMail = 9504, 
    mongo = 27017, rabbitMQ = 5672, sendMail = 465, elastic = 9200}

function getURL(IP:string, Port:number):string{
    return `${IP}:${Port}`
}

class IPSetting {
    gateIP: string
    accountServiceIP: string
    bookServiceIP: string
    transectionServiceIP: string
    rabbitMQIP: string
    mongodbIP: string
    mailIP: string
    elasticIP: string
}

export let currentIPSetting: IPSetting
export let gateDefaultURL:string = ""
export let accountServiceURL = ""
export let accountServiceClient:AccountServiceClient
export let bookServiceURL = ""
export let bookServiceClient:BookServiceClient
export let transectionServiceURL = ""
export let transectionServiceClient:TransectionServiceClient
export let mongoURL = ""
const rabbitMQUsername = 'root';
const rabbitMQPassword = '1234';
const mongoUsername = 'bookstore_user';
const mongoPassword = 'test';
export let googleCallbackUrl = ""
export let rabbitMQConnection:Connection
export let elasticClient: Client
let elasticIndex = ""

export function setElasticIndex(serviceName:string) {
    elasticIndex = serviceName
}

const localhostSetting = {
    gateIP : "127.0.0.1",
    accountServiceIP : "127.0.0.1",
    bookServiceIP : "127.0.0.1",
    transectionServiceIP : "127.0.0.1",
    rabbitMQIP : "localhost",
    mongodbIP : `127.0.0.1`,
    mailIP : "127.0.0.1",
    elasticIP : "127.0.0.1"
}

const dockerSetting = {
    gateIP : "gate-container",
    accountServiceIP : "micro-account-container",
    bookServiceIP : "micro-book-container",
    transectionServiceIP : "micro-transection-container",
    rabbitMQIP : "rabbitMQ-container-0",
    mongodbIP : `host.docker.abc`,    
    mailIP : "micro-mail-container",
    elasticIP : `elastic-container`,  
}

const dockerComposeSetting = {
    gateIP : "gate-service",
    accountServiceIP : "micro-account-service",
    bookServiceIP : "micro-book-service",
    transectionServiceIP : "micro-transection-service",
    rabbitMQIP : "rabbitMQ-service-0",
    mongodbIP : `host.docker.abc`,    
    mailIP : "micro-mail-service",
    elasticIP : `elastic-service`,  
}

export enum channelName { getVerificationCode = "getVerificationCode"}
export const googleVerifyID = "118619557524-ej7k7ceopnn8glgi9foksta3t72vnca3.apps.googleusercontent.com"
export const googleVerifyPassword = "***"
export const websiteEmail = 'wielh.erlow@gmail.com'
export let googleVerificationUrl = ""
export let oauth2Client:OAuth2Client

function getIPSetting() {
    const args: string[] = process.argv;
    if (args.length <= 2) {
        currentIPSetting = localhostSetting
        return
    }

    try {
        let type = parseInt(args[2])
        switch(type) {
            case 1:
                currentIPSetting = dockerSetting
                break
            case 2:
                currentIPSetting = dockerComposeSetting
                break
            default:
                currentIPSetting = localhostSetting
                break
        }
    } catch (error) {
        currentIPSetting = localhostSetting
        return
    }
} 

async function URLInit() {
    getIPSetting()
    let c = currentIPSetting

    gateDefaultURL = getURL(localhostSetting.gateIP, Port.gate)
    googleCallbackUrl = `http://${gateDefaultURL}/account/google_callback`
    oauth2Client = new google.auth.OAuth2(googleVerifyID,googleVerifyPassword,googleCallbackUrl)
    googleVerificationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ["email","profile"],
        include_granted_scopes: true
    });
    console.log(googleVerificationUrl)

    accountServiceURL = getURL(c.accountServiceIP, Port.microAccount)
    accountServiceClient = new AccountServiceClient(accountServiceURL , credentials.createInsecure())
    
    bookServiceURL = getURL(c.bookServiceIP, Port.microBook)
    bookServiceClient = new BookServiceClient(bookServiceURL , credentials.createInsecure())
    
    transectionServiceURL = getURL(c.transectionServiceIP, Port.microTransection)
    transectionServiceClient = new TransectionServiceClient(transectionServiceURL,credentials.createInsecure())
 
    try {
        let mongoStr = `mongodb://${mongoUsername}:${mongoPassword}@${getURL(c.mongodbIP,Port.mongo)}`
        await mongoose.connect(mongoStr, {dbName:"bookstore", readPreference:"secondaryPreferred",  
            directConnection:true , serverSelectionTimeoutMS:2000, authSource: "bookstore"})
    } catch(error) {
        console.error('Error connecting to MongoDB with host:', error);
    } 

    elasticClient = new Client({node: `${getURL(c.elasticIP,Port.elastic)}`, maxRetries:3});
    logger = createLogger({
        level: 'info',
        format: format.json(),
        transports: [new transports.Console()],
    });
}

export async function rabbitMQconnect() {
    const rabbitMQURL = getURL(currentIPSetting.rabbitMQIP, Port.rabbitMQ)
    const rabbitMQConenctionStr = `amqp://${rabbitMQUsername}:${rabbitMQPassword}@${rabbitMQURL}/`;
    try {
        rabbitMQConnection = await connect(rabbitMQConenctionStr);
    } catch(err) {
        console.error('Error connecting to rabbitMQ with host:', err);
    }
}

export const transporter = createTransport(
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

function generateMessage(username:string, functionName: string, message:string, data:any):string {
    return `[${functionName}][${username}][${getCurrentDatetime()}]:${message},data=|| ${data} ||`
}

export function errorLogger(username:string, functionName:string, message:string, data:any, error:any):void {
    logger.error(generateMessage(username, functionName, message, data), error)
    elasticClient.index({index:elasticIndex,body: {
        functionName: functionName, 
        message: message,
        data: data,
        level : "error", 
        error: error,
        datetime: new Date()
    }});
}

export function warnLogger(username:string, functionName:string, message:string, data:any, error:any):void {
    logger.warn(generateMessage(username, functionName, message, data), error)
    elasticClient.index({index:elasticIndex,body: {
        functionName: functionName, 
        message: message,
        data: data,
        level : "warn", 
        error: error,
        datetime: new Date()
    }});
}

export function infoLogger(username:string, functionName:string, message:string, data:any):void {
    logger.info(generateMessage(username, functionName, message, data))
    elasticClient.index({index:elasticIndex,body: {
        functionName: functionName, 
        message: message,
        data: data,
        level : "Info", 
        datetime: new Date()
    }});
}

await URLInit()