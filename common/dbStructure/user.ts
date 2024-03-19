

import { Schema, Document, model } from 'mongoose';

class NormalUserDocument extends Document {
    accountType : number
    username : string
    password : string
    email : string
    balance : number
    emailVerified : number
}

const NormalUserSchema = new Schema({
    username: String,
    accountType: Number,
    password : String,
    email : String,
    balance : Number,
    emailVerified : Number
});

const NormalUserModel = model<NormalUserDocument>('user', NormalUserSchema)

export async function normalUserExist(username:string): Promise<boolean> {
    let doc = await NormalUserModel.findOne({username:username, accountType:0})
    return !doc==null
}

export async function insertNormalUser(username:string, password:string, email:string): Promise<void> {
    await NormalUserModel.create({
        username:username, password: password, email: email, accountType:0, balance:0, emailVerified: 0 })
}

export async function emailVerify(username:string): Promise<boolean> {
    let doc = await NormalUserModel.findOneAndUpdate({username:username, emailVerified: {$ne:1}},{$set:{emailVerified:1}})
    return !doc==null
}

export async function resetPassword(username:string, password:string, newPassword:string): Promise<boolean> {
    let r = await NormalUserModel.updateOne({username:username, password:password}, {$set:{password:newPassword}})
    return r.modifiedCount >0
}

export async function normalUserTransection(username:string, gold:number) {
    let r =  await NormalUserModel.updateOne({username:username, balance:{$gte:gold}, accountType:0}, {$inc: { balance: -1*gold }})
    return r.modifiedCount > 0
}

//==================================================================================================

class GoogleUserDocument extends Document {
    accountType : number 
    googleID : string
    googleName : string
    email : string
    balance : number
    emailVerified : number
}

const GoogleUserSchema = new Schema({
    accountType : Number, 
    googleID : String,
    googleName : String,
    email : String,
    balance : Number,
    emailVerified : Number
})

const GoogleUserModel = model<GoogleUserDocument>('User', GoogleUserSchema)

export async function googleUserExist(googleID:string): Promise<boolean> {
    let doc = await GoogleUserModel.findOne({googleID:googleID, accountType:1})
    return !doc==null
}

export async function insertGoogleUser(googleID:string, googleName:string, email:string): Promise<void> {
    await GoogleUserModel.create({
        googleID: googleID, username:googleName , email:email,  accountType:1, balance:0, emailVerified:1})
}

export async function googleUserTransection(googleID:string, gold:number) {
    let r =  await GoogleUserModel.updateOne({googleID:googleID, balance:{$gte:gold}, accountType:1}, {$inc: { balance: -1*gold }})
    return r.modifiedCount > 0
}

//==================================================================================================

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

export async function transection(username:string, accountType:number, gold:number): Promise<boolean> {
    switch(accountType) {
        case 0:
            return await normalUserTransection(username,gold)
        case 1:
            return await googleUserTransection(username,gold)
        default:
            return false
    }
}