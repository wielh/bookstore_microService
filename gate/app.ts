import {Port, setElasticIndex} from '../common/config.js';
import express from 'express';
import {registerRouter} from './router/router.js'
import {infoLogger} from '../common/config.js'

var app = express();
registerRouter(app)
setElasticIndex("gate")
//start
app.listen(Port.gate, function () {
    infoLogger("gate-service", "app.listen", `Example app listening on port ${Port.gate} !`, "")
});
 

 