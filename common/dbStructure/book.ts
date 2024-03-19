import { Schema, Document, model, FilterQuery, Types } from 'mongoose';
import {pageX} from '../utils.js'

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
});

const bookModel = model<BookDocument>('book', bookSchema)

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
    pageSize:number, page:number, bookCount:number): Promise<(Document<unknown, {}, BookDocument> & BookDocument & {_id: Types.ObjectId; })[]>{

    let pageConfig = new pageX(pageSize, bookCount)
    let skipNumber = pageConfig.getSkip(page)
    let filter = generateFilters(bookName, tags, priceLowerbound, priceUpperbound) 
    let result = (await bookModel.find(filter).skip(skipNumber).limit(pageSize).exec())
    return result
}

export async function getBookById(bookId:string): Promise<BookDocument>{
    return await bookModel.findById(bookId)
}


