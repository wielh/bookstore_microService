

import { Schema, Document, model, ClientSession} from 'mongoose';
import {accountType} from '../config.js'

class UserDocument extends Document {
    name : string
    email : string
    balance : number
}

class NormalUserDocument extends UserDocument {
    accountType: Number
    username: String
    password : String
    emailVerified : Number
}

const NormalUserSchema = new Schema({
    accountType: Number,
    username: String,
    password : String,
    emailVerified : Number
},{
    versionKey: false, 
    strict: false
});

class GoogleUserDocument extends UserDocument {
    accountType: number
    googleID: string
}

const GoogleUserSchema = new Schema({
    accountType: Number,
    googleID: String,
},{
    versionKey: false, 
    strict: false
});

const NormalUserModel = model<NormalUserDocument>('NormalUser', NormalUserSchema, "user")

const GoolgeUserModel = model<GoogleUserDocument>('GoolgeUser', GoogleUserSchema, "user")

export async function normalUserExist(username:string): Promise<boolean> {
    let doc = await NormalUserModel.findOne({username:username, accountType:accountType.normal})
    return !(doc==null)
}
export async function normalUserExistWithPwd(username:string, password:string): Promise<boolean> {
    let doc = await NormalUserModel.findOne({username:username, password:password, accountType:accountType.normal})
    return !(doc==null)
}

export async function insertNormalUser(username:string, password:string, email:string): Promise<void> {
    await NormalUserModel.create({
        username:username, password: password, email: email, accountType:accountType.normal, balance:0, emailVerified: 0 })
}

export async function resetPassword(username:string, password:string, newPassword:string): Promise<boolean> {
    let r = await NormalUserModel.updateOne({username:username, password:password}, {$set:{password:newPassword}})
    return r.modifiedCount >0
}

export async function normalEmailCheckAndChange(username:string, email:string): Promise<boolean> {
    let doc = await NormalUserModel.findOneAndUpdate({username:username, accountType:accountType.normal, emailVerified: 0},{$set:{email:email}})
    return !(doc==null)
}

export async function normalEmailVerify(username:string): Promise<boolean> {
    let doc = await NormalUserModel.findOneAndUpdate({username:username, accountType:accountType.normal, emailVerified: 0},{$set:{emailVerified:1}})
    return !(doc==null)
}

export async function googleUserExist(googleID:string): Promise<boolean> {
    let doc = await GoolgeUserModel.findOne({googleID:googleID, accountType:accountType.google})
    return !(doc==null)
}

export async function insertGoogleUser(googleID:string, googleName:string, email:string): Promise<void> {
    await GoolgeUserModel.create({
        googleID: googleID, name:googleName , email:email,  accountType:accountType.google, balance:0, emailVerified:1})
}

export async function userExist(name:string, accountType:number): Promise<boolean> {
    switch(accountType) {
        case 0:
            return await normalUserExist(name)
        case 1:
            return await googleUserExist(name)
        default:
            return false
    }
}

export async function transection(username:string, accountType:number, gold:number, session: ClientSession): Promise<boolean> {
    switch(accountType) {
        case 0:
            let r0 =  await NormalUserModel.updateOne({username:username, accountType:accountType, balance:{$gte:gold}}, {$inc: { balance: -1*gold }}, {session:session})
            return r0.modifiedCount > 0
        case 1:
            let r1 =  await GoolgeUserModel.updateOne({googleID:username, accountType:accountType, balance:{$gte:gold}}, {$inc: { balance: -1*gold }}, {session:session})
            return r1.modifiedCount > 0
        default:
            return false
    }
}