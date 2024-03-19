import {ActivityRequest,ActivityReponse, ActivityReponseData} from '../proto/transection.js'
import * as grpc from "@grpc/grpc-js";
import { mongoDB, mongoTable, logger} from '../common/config.js'
import { generateMessage, getTimeStampSecond} from '../common/utils.js'
import { errMongo, errSuccess} from '../common/errCode.js'
import * as activityDB from '../common/dbStructure/activity'

// 1. 打折
// 2. 買5送1
// 3. 滿2000送200
export async function activityList(call: grpc.ServerUnaryCall<ActivityRequest,ActivityReponse>, callback: grpc.sendUnaryData<ActivityReponse>) {
    let functionName:string = "activityList"
    let req = call.request
    let res = new ActivityReponse()
    let now = getTimeStampSecond()

    try {
        let activitys = await activityDB.findActivities(now)
        for (let activity of activitys) {
            let activityRes = new ActivityReponseData()
            activityRes.activityType = activity.activityBase.type
            activityRes.startDate = activity.activityBase.startDate
            activityRes.endDate = activity.activityBase.endDate
            activityRes.activityInfo = JSON.stringify(activity.level)
            res.data.push(activityRes)
        }
    } catch (error) {
        logger.error(generateMessage("", functionName, "mongoErr happens while searching book", req))
        res.errCode = errMongo
        callback(error,res)
    }

    res.errCode = errSuccess
    callback(null,res)
}
