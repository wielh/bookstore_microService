import { Schema, Document, model, Types } from 'mongoose';
import { getCurrentMonthFirstDayTimestamp, pageX} from '../utils.js'

class BookInfo {
    bookId : string
    bookNumber : number
    price : number
}

class transectionLogDocument extends Document{
    username : string
    accountType : number
    activityID : string
    activityType : number
    transectionTime : number
    price : number
    totalPrice: number
    bookInfo : BookInfo[]
}

const transectionLogSchema = new Schema({
    username : String,
    accountType : Number,
    activityID : String,
});

const transectionLogModel = model<transectionLogDocument>('transection_log', transectionLogSchema)

export async function insertLog(username:string, accountType:number, activityID: string, time: number, totalPrice:number, bookInfo : BookInfo[]){
    await transectionLogModel.create({username:username, accountType:accountType, activityID:activityID, time:time, 
        totalPrice:totalPrice, bookInfo: bookInfo})
}

export async function countLog(username:string, accountType:number): Promise<number> {
    return await transectionLogModel.countDocuments({username:username, accountType:accountType})
}

export async function getLogData(username:string, accountType:number, pageSize:number, page:number, count:number): 
    Promise<(Document<unknown, {}, transectionLogDocument> & transectionLogDocument & {_id: Types.ObjectId; })[]> {
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
});

const IncomeMonthlyModel = model<IncomeMonthlyDocument>('transection_log', IncomeMonthlySchema)

export async function updateBalance(timeStamp: number, gold: number): Promise<boolean>{
   let r = await IncomeMonthlyModel.updateOne({timeStamp: getCurrentMonthFirstDayTimestamp(timeStamp)},{$inc:{ balance: gold }})
   return r.modifiedCount > 0
}
