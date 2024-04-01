import { Schema, Document, model, Types } from 'mongoose';

class ActivityDocument extends Document{
    type: number
    startDate: number
    endDate : number
    levelType1: LevelType1[]
    levelType2: LevelType2[]
    levelType3: LevelType3[]
}

class LevelType1 {
    price:number
    discount:number
}

class LevelType2 {
    price:number
    discount:number
}

class LevelType3 {
    by: number
    give: number
    bookIds : string[]
}

const activitySchema = new Schema({
    type : Number,
    startDate : Number,
    endDate :Number
},{
    versionKey: false, 
    strict: false
});

const activityModel = model<ActivityDocument>('activity', activitySchema, 'activity')

export async function findActivities(timeStamp:number){
    let activitys = await activityModel.find({startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}}).limit(1000).exec()
    return activitys
}

export async function findActivityType1ById(Id: string, timeStamp:number):Promise<ActivityDocument>{
    let activity = await activityModel.findOne({ _id: new Types.ObjectId(Id), type:1, startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}})
    return activity
}

export async function findActivityType2ById(Id: string, timeStamp:number):Promise<ActivityDocument>{
    let activity = await activityModel.findOne({ _id: new Types.ObjectId(Id), type:2, startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}})
    return activity
}

export async function findActivityType3ById(Id: string, timeStamp:number):Promise<ActivityDocument>{
    let activity = await activityModel.findOne({ _id: new Types.ObjectId(Id), type:3, startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}})
    return activity
}

export async function findActivityById(id:string, activityType:number):Promise<ActivityDocument> {
    return await activityModel.findOne({ _id: new Types.ObjectId(id), type:activityType})
}




