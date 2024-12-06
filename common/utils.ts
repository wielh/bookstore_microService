
import jwt from 'jsonwebtoken';

import { GlobalConfig, elasticClient, log as logger, rabbitMQConenctionStr} from '../common/init.js'
import { connect, Connection } from 'amqplib'
import { hash, genSalt, compare } from "bcrypt"

export async function passwordHash(password:string):Promise<string> {
    const salt = await genSalt(10);
    return await hash(password, salt);
};

export async function comparePassword(plainTextPassword:string, hashedPassword:string): Promise<boolean> {
    try {
       return await compare(plainTextPassword, hashedPassword);
    } catch (error) {
       return false;
    }
}

export function getCurrentDatetime():string{
    var m = new Date();
    var dateString =
        m.getUTCFullYear() + "/" +
        ("0" + (m.getUTCMonth()+1)).slice(-2) + "/" +
        ("0" + m.getUTCDate()).slice(-2) + " " +
        ("0" + m.getUTCHours()).slice(-2) + ":" +
        ("0" + m.getUTCMinutes()).slice(-2) + ":" +
        ("0" + m.getUTCSeconds()).slice(-2);
    return dateString;
}

export function castToString(value: any): string {
    if (typeof value === 'string') {
        return value
    }
    return ""
}

export function castToStringArray(values: any): string[] {
    if (Array.isArray(values)) {
        return []
    }

    const valueArray = values as any[]
    const areAllStrings = valueArray.every(value => typeof value === 'string');
    if(!areAllStrings) {
        return []
    }
    return valueArray
}


interface UserTokenVal {
    username: string;
    accountType: number;
    email: string;
}

const { sign } = jwt

export function decodeToken(token:string):UserTokenVal {
    try {
        const val = jwt.decode(token) as UserTokenVal; 
        if (
            val &&
            typeof val.username === 'string' &&
            typeof val.accountType === 'number' &&
            typeof val.email === 'string'
          ) {
            return val;
          } else {
            return null
          }
    } catch(e){
        console.log("cannot parse token, reason:");
        console.log(e);
        return null;
    }
}

export function createToken(user: UserTokenVal, second:number):string{
    return sign(user, GlobalConfig.API.tokenKey, { expiresIn: second});
}

export class pageX {
    pageSize: number
    count: number
    totalPageNumber: number

    public constructor(pageSize:number, count:number){
        this.pageSize =  pageSize>2 ? pageSize:10
        this.count = count>0? count:0
        this.totalPageNumber = Math.floor(this.count/this.pageSize) + ((this.count%this.pageSize>0)?1:0)
    }

    public getPageSize():number {
        return this.pageSize
    }

    public getCount():number {
        return this.count
    }

    public getTotalPageNumber():number {
        return this.totalPageNumber
    }

    public getPageNumber(pageNumber:number):number {
        if(pageNumber < 0){
            return 0
        } else if (pageNumber >= this.totalPageNumber) {
            return this.totalPageNumber-1
        } 
        return Math.floor(pageNumber)
    }

    public getSkip(currentPage:number):number{
        if (currentPage <= 0 || this.totalPageNumber<=0 ) {
            return 0
        } else if ( currentPage >= this.totalPageNumber) {
            return (this.totalPageNumber -1 )* this.pageSize
        }

        return currentPage * this.pageSize
    }
}

export function getCurrentMonthFirstDayTimestamp(currentDateTime:number): number {
    const currentDate = new Date(currentDateTime);
    const MonthlyFirstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
    return MonthlyFirstDay.getTime();
}

//============================================================================================================

var rabbitMQConnection: Connection 

export function getRabbitMQConnection() {
    return rabbitMQConnection
}

export async function rabbitMQconnect() {
    try {
        rabbitMQConnection = await connect(rabbitMQConenctionStr);
    } catch(err) {
        console.error('Error connecting to rabbitMQ with host:', err);
    }
}

export async function sendMailProducer(rabbitMQConnection:Connection, emailAddress:string, subject:string , message:string): Promise<boolean>{
    try {
        const channel = await rabbitMQConnection.createChannel();
        await channel.assertQueue(GlobalConfig.rabbitMQ.ChannelName.getVerificationCode, { durable: true });
        const rabbitMQMessage = JSON.stringify(
            {emailAddress:emailAddress, subject:subject ,message:message})
        channel.sendToQueue(GlobalConfig.rabbitMQ.ChannelName.getVerificationCode, Buffer.from(rabbitMQMessage))
        await channel.close();
    } catch (error) {
        return false;
    }
    return true
}

//============================================================================================================

function generateMessage(username:string, functionName: string, message:string, data:any):string {
    return `[${functionName}][${username}][${getCurrentDatetime()}]:${message},data=|| ${data} ||`
}

function getFuncName(): string {
    const stack = new Error().stack;
    if (stack) {
        const match = stack.match(/at (\w+)/);
        if (match && match[2]) {
            return match[2]
        }
    }
    return ""
}

let elasticIndex = ""

export function setElasticIndex(serviceName:string) {
    elasticIndex = serviceName
}

export function errorLogger(username:string, message:string, data:any, error:any):void {
    const funcName = getFuncName()
    logger.error(generateMessage(username, funcName , message, data), error)
    elasticClient.index({index:elasticIndex,body: {
        functionName: funcName , 
        message: message,
        data: data,
        level : "error", 
        error: error,
        datetime: new Date()
    }});
}

export function warnLogger(username:string, message:string, data:any, error:any):void {
    const funcName = getFuncName()
    logger.warn(generateMessage(username, funcName , message, data), error)
    elasticClient.index({index:elasticIndex,body: {
        functionName: funcName , 
        message: message,
        data: data,
        level : "warn", 
        error: error,
        datetime: new Date()
    }});
}

export function infoLogger(username:string, message:string, data:any):void {
    const funcName = getFuncName()
    logger.info(generateMessage(username, funcName ,  message, data))
    elasticClient.index({index:elasticIndex,body: {
        functionName: funcName, 
        message: message,
        data: data,
        level : "Info", 
        datetime: new Date()
    }});
}

// ===================================================================
