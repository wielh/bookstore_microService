
import {Express, Request, Response,NextFunction} from 'express'

import {registerServiceAccount} from './action/account.js'
import {registerServiceBook} from './action/book.js'
import {registerServiceTransection} from './action/transection.js'
import {logger} from '../../common/config.js';
import {errUnknown} from '../../common/errCode.js'

export function registerRouter(app: Express){
    app.use('/account', registerServiceAccount())
    app.use('/book', registerServiceBook())
    app.use('/transection', registerServiceTransection())
    app.use((error:Error, req:Request, res:Response, next: NextFunction)=>{
        logger.warn("An unexpected error happens,reason:\n" + error.stack)
        res.status(500).json({errCode: errUnknown})
    })
}




