import { Schema, Document, model, Types, ClientSession } from 'mongoose';
import { getCurrentMonthFirstDayTimestamp, pageX} from '../utils.js'

class transectionLogDocument extends Document{
    username : string
    accountType : number
    activityID : string
    activityType : number
    time : number
    price : number
    totalPrice: number
    bookInfo : {
        bookId : string
        bookNumber : number
        price : number
    }[]
}

const transectionLogSchema = new Schema({
    username : String,
    accountType : Number,
    activityID : String
},{
    versionKey: false, 
    strict: false
});

export var transectionLogModel = model<transectionLogDocument>('transection_log', transectionLogSchema,'transection_log')

export async function insertLog(username:string, accountType:number, activityID: string, time: number, totalPrice:number, 
    bookInfo:{bookId : string ,bookNumber : number, price : number}[], session: ClientSession){

    await transectionLogModel.create([{username:username, accountType:accountType, activityID:activityID, time:time, 
        totalPrice:totalPrice, bookInfo: bookInfo}], {session:session})
}

export async function countLog(username:string, accountType:number): Promise<number> {
    return await transectionLogModel.countDocuments({username:username, accountType:accountType})
}

export async function getLogData(username:string, accountType:number, pageSize:number, page:number, count:number) {
    let pageConfig = new pageX(pageSize, count)
    let skipNumber = pageConfig.getSkip(page)
    let result = await transectionLogModel.find({username:username, accountType:accountType}).skip(skipNumber).limit(pageSize).exec()
    return result
}

class IncomeMonthlyDocument extends Document {
    timeStamp: number
    balance: number
}

const IncomeMonthlySchema = new Schema({
    timeStamp: Number,
    balance: Number
},{
    versionKey: false, 
    strict: false
});

export var IncomeMonthlyModel = model<IncomeMonthlyDocument>('income_monthly', IncomeMonthlySchema, 'income_monthly')

export async function updateBalance(timeStamp: number, gold: number, session:ClientSession): Promise<boolean>{
   let r = await IncomeMonthlyModel.updateOne({timeStamp: getCurrentMonthFirstDayTimestamp(timeStamp)},{$inc:{ balance: gold }}, {session:session})
   return r.modifiedCount > 0
}
