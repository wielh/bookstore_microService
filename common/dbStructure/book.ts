import { Schema, Document, model, FilterQuery, Types, ClientSession } from 'mongoose';
import {pageX} from '../utils.js'
import { objectId } from 'mongodb-typescript';

class BookDocument extends Document{
    bookName: string
    price: number
    remainNumber: number
    tags: string[]
}

const bookSchema = new Schema({
    bookName: String,
    price: Number,
    remainNumber: Number
},{
    versionKey: false, 
    strict: false
});

export var bookModel = model<BookDocument>('book', bookSchema,'book')

function generateFilters(bookName:string, tags:string[], priceLowerbound:number, priceUpperbound:number): FilterQuery<BookDocument> {
    let filter: FilterQuery<BookDocument> = {};
    if (bookName != "") {
        filter.bookName = { $regex: `/^${bookName}/` }
    } 

    if (tags.length > 0) {
        filter.tags = { $in: tags }
    }

    if (priceLowerbound > 0) {
        filter.price = { $gt: priceLowerbound}
    }

    if (priceUpperbound > 0) {
        filter.price = { $lt: priceUpperbound}
    }
    return filter
}

export async function count(bookName:string, tags:string[], priceLowerbound:number, priceUpperbound:number):Promise<number>{
    let filter:FilterQuery<BookDocument> = generateFilters(bookName, tags, priceLowerbound, priceUpperbound) 
    let bookCount = await bookModel.countDocuments(filter)
    return bookCount
}

export async function getbookData(bookName:string, tags:string[], priceLowerbound:number, priceUpperbound:number, 
    pageSize:number, page:number, bookCount:number){
    let pageConfig = new pageX(pageSize, bookCount)
    let skipNumber = pageConfig.getSkip(page)
    let filter = generateFilters(bookName, tags, priceLowerbound, priceUpperbound) 
    let result = await bookModel.find(filter).skip(skipNumber).limit(pageSize)
    return result
}

export async function getBookById(bookId:string): Promise<BookDocument>{
    return await bookModel.findOne({_id:new Types.ObjectId(bookId)})
}

export async function takeBooks(bookId:string, bookNumber:number, session:ClientSession):Promise<boolean> {
    let r = await bookModel.findOneAndUpdate(
        {_id:new Types.ObjectId(bookId) , remainNumber:{$gte:bookNumber}}, {$inc:{remainNumber:-1*bookNumber}}, { new:true, session: session})
    return !(r == null)
}


