import {createHmac} from "crypto";
import jwt from 'jsonwebtoken';

import {hashSalt} from "./config.js";
import {tokenKey,rabbitMQConnection, channelName} from '../common/config.js'


export function passwordHash(password:string):string {
    for(let i=0;i<10;i++){
        password = createHmac('sha512',hashSalt).update(password).digest('hex');
    }
    return password;
};

export function checkParameterFormat(object:any, key:string, typeof_value:string, optional?:boolean): boolean{
    if( object[key] === undefined || object[key] === null) {
        if (!optional) {
            return false
        }
        return true
    }

    let obj = object[key]
    if (typeof_value == 'json') {
        try {
            JSON.parse(obj)
            return true;
        } catch (error) {
            return false;
        }
    } else if (typeof_value.split(":")[0] == "array" && typeof_value.split(":").length>1){
        if (!Array.isArray(obj)) {
            return false
        }
        let type: string = typeof_value.split(":")[1] 
        return obj.every(item => typeof item === type);
    } else {
        return ((typeof obj) === typeof_value)
    }
}

function getCurrentDatetime():string{
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

export function generateMessage(username:string, functionName: string, message:string, data:any):string {
    return `[${functionName}][${username}][${getCurrentDatetime()}]:${message},data=|| ${data} ||`
}

const { sign, verify } = jwt

export function decodeToken(token:string):any{
    try {
        return jwt.decode(token);
    } catch(e){
        console.log("cannot parse token, reason:");
        console.log(e);
        return JSON.parse("{}");
    }
}

export function createToken(json:any, second:number):string{
    return sign(json,  tokenKey, { expiresIn: second});
}

export class pageX {
    pageSize: number
    count: number
    pageNumber: number

    public constructor(pageSize:number, count:number){
        this.pageSize =  pageSize>2 ? pageSize:10
        this.count = count>0? count:0
        this.pageNumber = Math.floor(count/pageSize) + ((count%pageSize>0)?1:0)
    }

    public getPageSize():number {
        return this.pageSize
    }

    public getCount():number {
        return this.count
    }

    public getTotalPageNumber():number {
        return this.pageNumber
    }

    public getPageNumber(pageNumber:number):number {
        if(pageNumber < 0){
            return 0
        } else if (pageNumber >= this.pageNumber) {
            return this.pageNumber-1
        } 
        return Math.floor(pageNumber)
    }

    public getSkip(currentPage:number):number{
        if (currentPage <= 0 || this.pageNumber<=0 ) {
            return 0
        } else if ( currentPage >= this.pageNumber) {
            return (this.pageNumber -1 )* this.pageSize
        }

        return currentPage * this.pageSize
    }
}

export function getCurrentMonthFirstDayTimestamp(currentDateTime:number): number {
    const currentDate = new Date(currentDateTime);
    const MonthlyFirstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
    return MonthlyFirstDay.getTime();
}

export async function sendMailProducer(emailAddress:string, subject:string , message:string): Promise<boolean>{
    try {
        const channel = await rabbitMQConnection.createChannel();
        await channel.assertQueue(channelName.getVerificationCode, { durable: true });
        const rabbitMQMessage = JSON.stringify(
            {emailAddress:emailAddress, subject:subject ,message:message})
        channel.sendToQueue(channelName.getVerificationCode, Buffer.from(rabbitMQMessage))
        await channel.close();
    } catch (error) {
        return false;
    }
    return true
}