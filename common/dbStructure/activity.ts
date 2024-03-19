import { Schema, Document, model, Types } from 'mongoose';

class ActivityDocument extends Document{
    type: number
    startDate: number
    endDate : number
    level: any[]
}

class ActivityType1Document extends Document{
    type: number
    startDate: number
    endDate : number
    level: level1[]
}

class ActivityType2Document extends Document{
    type: number
    startDate: number
    endDate : number
    level: level2[]
}

class ActivityType3Document extends Document{
    type: number
    startDate: number
    endDate : number
    level: level3[]
}

class level1 {
    price:number
    discount:number
}

class level2 {
    price:number
    discount:number
}

class level3 {
    by: number
    give: number
    bookIds : number
}

const activitySchema = new Schema({
    activityID : String,
    type : Number,
    startDate : Number,
    endDate :Number
});

const activityModel = model<ActivityDocument>('activity', activitySchema)
const activityType1Model = model<ActivityType1Document>('activity', activitySchema)
const activityType2Model = model<ActivityType2Document>('activity', activitySchema)
const activityType3Model = model<ActivityType3Document>('activity', activitySchema)

export async function findActivities(timeStamp:number)
    : Promise<(Document<unknown, {}, ActivityDocument> & ActivityDocument & {_id: Types.ObjectId; })[]>{
    let activitys = await activityModel.find({startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}}).limit(1000).exec()
    return activitys
}

export async function findActivityType1ById(Id: string, timeStamp:number):Promise<ActivityType1Document>{
    let activity = await activityType1Model.findOne({ id: new Types.ObjectId(Id), type:1, startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}})
    return activity
}

export async function findActivityType2ById(Id: string, timeStamp:number):Promise<ActivityType2Document>{
    let activity = await activityType2Model.findOne({ id: new Types.ObjectId(Id), type:2, startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}})
    return activity
}

export async function findActivityType3ById(Id: string, timeStamp:number):Promise<ActivityType3Document>{
    let activity = await activityType3Model.findOne({ id: new Types.ObjectId(Id), type:3, startDate:{$lt: timeStamp}, endDate:{$gt: timeStamp}})
    return activity
}

export async function findActivityById(id:string, activityType:number):Promise<ActivityDocument> {
    return await activityModel.findOne({ id: new Types.ObjectId(id), type:activityType})
}




