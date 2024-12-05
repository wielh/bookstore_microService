import {GlobalConfig} from '../common/init.js';
import express from 'express';
import {registerRouter} from './router/router.js'
import {infoLogger, setElasticIndex} from '../common/utils.js'

var app = express();
registerRouter(app)
setElasticIndex("gate")
//start
app.listen(GlobalConfig.gate.port, function () {
    infoLogger("gate-service", `Example app listening on port ${GlobalConfig.gate.port} !`, "")
});
 

 