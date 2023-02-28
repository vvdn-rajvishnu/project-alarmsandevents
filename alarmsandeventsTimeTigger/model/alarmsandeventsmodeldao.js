var objdaoimpl = require('../dao/mongodaoimpl.js');
var async = require('async');
var moment = require("moment");
var objmysqldaoimpl = require('../dao/mysqldaoimpl.js');
var objManagerialDatadaoimpl = require('../model/managerialdatadaoimpl.js');
var objtransformereventsmodel = require('../model/sqltables/alarmseventstransformer.js');
var objtransformereventslatestmodel = require('../model/sqltables/alarmseventstransformerlatest.js');
var objjsFunctions = require('../util/jsfunctions.js');
var objConfig = require('../config.js');
var fs = require('fs');
var path = require('path');
var dbConMysql = require('../dao/mysqlconnector.js');
const json2csv = require('json2csv').parse;
var intnumofdays = objConfig.numberofDaysTransMeterTransaction;
const dateTime = new Date().toLocaleString().slice(-24).replace(/\D/g, '').slice(0, 14);
require('dotenv').config('../.env');
//var connection = dbConMysql.getDbconnection

//for local test
// var filePathHsLatest = path.join(__dirname, "../../../", "project-datamart", "alarmsandevents", "public", "csvHslatest-" + dateTime + ".csv");

// var filePath = path.join(__dirname, "../../../", "project-datamart", "alarmsandevents", "public", "csv-" + dateTime + ".csv");

/** When uploading from Azure system*/
 var filePath = process.env.csvPath + "/csv-" + dateTime + ".csv";
 var filePathHsLatest = process.env.csvPath + "/csvHslatest-" + dateTime + ".csv";

// /** When uploading from Ubuntu system*/
// var filePathHsLatest = path.join(__dirname, "../../../", "project-datamart", "alarmsandevents", "public", "csvHslatest-" + dateTime + ".csv");
// var filePath = path.join(__dirname, "../../../", "project-datamart", "alarmsandevents", "public", "csv-" + dateTime + ".csv");

const fields = [
    'Rev', 'Count', 'CountryCode', 'RegionCode', 'CellID', 'MeterSerialNumber', 'CircuitID', 'HypersproutID', 'TransformerID', 'Meter_DeviceID', 'Type', 'Action', 'Attribute', 'Phase', 'NoOfMeter', 'StatusTransformer', 'OverVoltage', 'UnderVoltage', 'OverLoadLine1MDAlarm', 'OverLoadLine2MDAlarm', 'OverLoadLine3MDAlarm', 'OverFrequency', 'UnderFrequency', 'PowerFailure',  'PTOpen', 'OilLevelSensorFailure', 'TamperLid', 'TamperBox', 'LowOilLevel', 'HighOilTemperature', 'LowBatteryVoltage', 'BatteryFailure', 'BatteryRemoved', 'PrimaryPowerUp', 'PrimaryPowerDown', 'NonTechnicalLoss', 'MeterConnected', 'MeterDisconnected', 'WiFiCommunicationLoss', 'threeG4GLTECommunicationLoss', 'Communicationattemptsexceeded', 'UnAuthenticatedConnectionRequest', 'ReadTimestamp', 'DBTimestamp', 'Meter_Phase', 'Meter_Status', 'Meter_ReadTimestamp', 'Meter_VoltageSagLine1', 'Meter_VoltageSagLine2', 'Meter_VoltageSagLine3', 'Meter_VoltageSwellLine1', 'Meter_VoltageSwellLine2', 'Meter_VoltageSwellLine3', 'Meter_VoltageUnbalance', 'Meter_VoltageCablelossLine1', 'Meter_VoltageCablelossLine2', 'Meter_VoltageCablelossLine3', 'Meter_VoltageTHDOverLimitLine1', 'Meter_VoltageTHDOverLimitLine2', 'Meter_VoltageTHDOverLimitLine3', 'Meter_CurrentTHDOverLimitLine1', 'Meter_CurrentTHDOverLimitLine2', 'Meter_CurrentTHDOverLimitLine3', 'Meter_PrimaryPowerUp', 'Meter_PrimaryPowerDown', 'Meter_LongOutagedetection', 'Meter_ShortOutagedetection', 'Meter_NonvolatileMemoryFailed', 'Meter_Clockerrordetected', 'Meter_LowBatteryVoltage', 'Meter_FlashMemoryFailed', 'Meter_Firmwareupgraded', 'Meter_Demandreset', 'Meter_TimeSynchronized', 'Meter_Historylogcleared', 'Meter_Coverremoval', 'Meter_Terminalcoverremoval', 'Meter_MeterDisconnected', 'Meter_MeterConnected', 'Meter_Demandresponseofimportactpwr_kWpostive', 'Meter_Demandresponseofexportactpwr_kWnegative', 'Meter_Demandresponseofexportreactpwr_kVarpositive', 'Meter_Demandresponseofexportreactpwr_kVarnegative', 'createdAt', 'updatedAt'
];
var intnumofdays = 1;

var logger = console;
var countval;
var totalNoOfRecords;
var insertCallbackCount;
var objTimer;
var objTimerInterval;
var objLatestHSData = {};
var objLatestMeterData = {};
/**
* @description - Code to update Alarms and events
* @param context - console
* @param {Respose to be returned} callback
* @return - callback
*/
function updateAlarmsandEventsDataToRDBMS(context, callback) {
    logger = context;
    objManagerialDatadaoimpl.getManagerialData(function (managerialDataerr, data) {
        async.parallel({
            transformerdata: function (callback) {
                updateAllTransformerDataWithPagination(context, data, callback);
            }
        }, function (err, results) {
            callback(err, results);
        });
    });
}
/**
* @description - Code to update Transformer Data
* @param managerialData - managerial data
* @param {Respose to be returned} callback
* @return - callback
*/
function updateAllTransformerData(managerialData, callback) {
    objmysqldaoimpl.truncateEntries("transformerevents", objtransformereventsmodel.objTransformerevents,
        objtransformereventsmodel.objTableProps, {}, function (err) {
            if (err) {
                logger.log(err);
            }
            countval = 0;
            totalNoOfRecords = 0;
            insertCallbackCount = 0;
            objmysqldaoimpl.synctable("alarmseventstransformerlatest", objtransformereventslatestmodel.objTransformerevents,
                objtransformereventslatestmodel.objTableProps, function (err) {
                    if (err) {
                        logger.log(err);
                    }
                    var cc = false;
                    var objStartDate;
                    objStartDate = new Date();
                    objStartDate.setUTCDate(objStartDate.getUTCDate() - intnumofdays);
                    objStartDate.setUTCMinutes(0);
                    objStartDate.setUTCSeconds(0);
                    objdaoimpl.getCursorFromCollection("DELTA_AlarmsAndEvents", ['DBTimestamp'], [{ $gt: objStartDate }], function (err, arrTransformerTransData) {
                        if (arrTransformerTransData) {
                            arrTransformerTransData.stream()
                                .on('data', function (meterTranItem) {
                                    processAlarmTransformerData(meterTranItem, managerialData);
                                    interruptWhnDefinedCountReached(arrTransformerTransData);
                                    countval++;
                                })
                                .on('error', function (err) {
                                    if (!cc) {
                                        callback(err, null);
                                        cc = true;
                                    }
                                    logger.log('errr:', err);
                                })
                                .on('end', function () {
                                    logger.log('end:');
                                    checkAndCallCallbackAfterFinish(function () {
                                        if (!cc) {
                                            callback();
                                            cc = true;
                                        }
                                    });
                                });
                        }
                    });
                });
        });
}

function updateAllTransformerDataWithPagination(context, managerialData, callback) {
    try {
        objmysqldaoimpl.truncateEntries("alarmseventstransformer", objtransformereventsmodel.objTransformerevents,
            objtransformereventsmodel.objTableProps, {}, function (err) {
                if (err) {
                    callback(err, null);
                } else {
                    objmysqldaoimpl.truncateEntries("alarmseventstransformerlatest", objtransformereventslatestmodel.objTransformerevents,
                        objtransformereventslatestmodel.objTableProps, {}, function (err) {
                            if (err) {
                                callback(err, null);
                            } else {

                                var objStartDate;
                                objStartDate = new Date();
                                //objStartDate = new Date("2020-06-08T05:00:00.131Z"); // Test on local
                                objStartDate.setUTCDate(objStartDate.getUTCDate() - intnumofdays);
                                objStartDate.setUTCMinutes(0);
                                objStartDate.setUTCSeconds(0);
                                objdaoimpl.fetchCount("DELTA_AlarmsAndEvents", ['DBTimestamp'], [{ $gt: objStartDate }], function (err, count) {
                                    if (err) {
                                        context.log(err);
                                    }
                                    var limit = 20;
                                    var pageNocount = Math.ceil(count / limit);
                                    var pageNo;
                                    var startInd;
                                    var loopcount = 0;
                                    bulkInsertArr = [];
                                    if (count > 0) {
                                        for (pageNo = 1; pageNo <= pageNocount; pageNo++) {
                                            startInd = (pageNo - 1) * limit;
                                            objdaoimpl.fetchWithLimit("DELTA_AlarmsAndEvents", ['DBTimestamp'], [{ $gt: objStartDate }], startInd, limit, function (err, details) {
                                                for (j = 0; j < details.length; j++) {
                                                    loopcount++;
                                                    meterTranItem = details[j];
                                                    processAlarmTransformerDataWithPagination(meterTranItem, managerialData, bulkInsertArr, function (bulkInsertArr) {
                                                        if (loopcount == count) {
                                                            let meterIDs = [];
                                                            let hypersproutSerialNumber = [];
                                                            for (let i in bulkInsertArr) {
                                                                if (bulkInsertArr.hasOwnProperty(i)) {
                                                                    meterIDs.push(bulkInsertArr[i].Meter_DeviceID)
                                                                    hypersproutSerialNumber.push(bulkInsertArr[i].HypersproutID)
                                                                }
                                                            }
                                                            if (hypersproutSerialNumber.length == bulkInsertArr.length) {
                                                                getAlrmsConfigDetails(hypersproutSerialNumber, meterIDs, bulkInsertArr, function (err, bulkInsertArr1) {
                                                                    try {
                                                                        csv = json2csv(bulkInsertArr1, { fields });
                                                                    } catch (err) {
                                                                        context.log(err);
                                                                        callback(err, null);
                                                                    }
                                                                    fs.appendFile(filePath, csv, function (err) {
                                                                        if (err) {
                                                                            context.log(err);
                                                                            callback(err, null);
                                                                        } else {
                                                                            insertCsvtomysql(context, filePath, callback);
                                                                        }
                                                                    });
                                                                })
                                                            }

                                                            //     try {
                                                            //     csv = json2csv(bulkInsertArr, { fields });
                                                            // } catch (err) {
                                                            //     context.log(err);
                                                            //     callback(err, null);
                                                            // }
                                                            // fs.appendFile(filePath, csv, function (err) {
                                                            //     if (err) {
                                                            //         context.log(err);
                                                            //         callback(err, null);
                                                            //     } else {
                                                            //         insertCsvtomysql(context, filePath, callback);
                                                            //     }
                                                            // });


                                                            /**This function call is added after csv creation and update */
                                                            // updateMeterAlarmLatestDataWithPagination();
                                                            // updateHypersproutAlarmLatestDataWithPagination();
                                                            // callback();
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    } else {
                                        callback();
                                    }
                                })

                            }
                        })
                }
            });
    } catch (exc) {
        callback(exc, null);
    }
}

function insertCsvtomysql(context, filepath, callback) {
    dbConMysql.pool.getConnection(function (err, connection) {
        if (err) {
            context.log("Error in GetConnection : " + err);
            callback(err, null);
        }
        else {
            var sql = "LOAD DATA LOCAL INFILE'" + filepath + "' REPLACE INTO TABLE alarmseventstransformer FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\r\n' IGNORE 1 LINES (`Rev`,`Count`,`CountryCode`,`RegionCode`,`CellID`,`MeterSerialNumber`,`CircuitID`,`HypersproutID`,`TransformerID`,`Meter_DeviceID`,`Type`,`Action`,`Attribute`,`Phase`,`NoOfMeter`,`StatusTransformer`,`OverVoltage`,`UnderVoltage`,`OverLoadLine1(MD Alarm)`,`OverLoadLine2(MD Alarm)`,`OverLoadLine3(MD Alarm)`,`OverFrequency`,`UnderFrequency`,`PowerFailure`,`PTOpen`,`OilLevelSensorFailure`,`TamperLid`,`TamperBox`,`LowOilLevel`,`HighOilTemperature`,`LowBatteryVoltage`,`BatteryFailure`,`BatteryRemoved`,`PrimaryPowerUp`,`PrimaryPowerDown`,`Non-TechnicalLoss`,`MeterConnected`,`MeterDisconnected`,`Wi-FiCommunicationLoss`,`3G/4G/LTECommunicationLoss`,`Communicationattemptsexceeded`,`UnAuthenticatedConnectionRequest`,`ReadTimestamp`,`DBTimestamp`,`Meter_Phase`,`Meter_Status`,`Meter_ReadTimestamp`,`Meter_VoltageSagLine1`,`Meter_VoltageSagLine2`,`Meter_VoltageSagLine3`,`Meter_VoltageSwellLine1`,`Meter_VoltageSwellLine2`,`Meter_VoltageSwellLine3`,`Meter_VoltageUnbalance`,`Meter_VoltageCablelossLine1`,`Meter_VoltageCablelossLine2`,`Meter_VoltageCablelossLine3`,`Meter_VoltageTHDOverLimitLine1`,`Meter_VoltageTHDOverLimitLine2`,`Meter_VoltageTHDOverLimitLine3`,`Meter_CurrentTHDOverLimitLine1`,`Meter_CurrentTHDOverLimitLine2`,`Meter_CurrentTHDOverLimitLine3`,`Meter_PrimaryPowerUp`,`Meter_PrimaryPowerDown`,`Meter_LongOutagedetection`,`Meter_ShortOutagedetection`,`Meter_NonvolatileMemoryFailed`,`Meter_Clockerrordetected`,`Meter_LowBatteryVoltage`,`Meter_FlashMemoryFailed`,`Meter_Firmwareupgraded`,`Meter_Demandreset`,`Meter_TimeSynchronized`,`Meter_Historylogcleared`,`Meter_Coverremoval`,`Meter_Terminalcoverremoval`,`Meter_MeterDisconnected`,`Meter_MeterConnected`,`Meter_Demandresponseofimportactpwr(kW+)`,`Meter_Demandresponseofexportactpwr(kW-)`,`Meter_Demandresponseofimportreactpwr(kVar+)`,`Meter_Demandresponseofexportreactpwr(kVar-)`,`createdAt`,`updatedAt`) set id = NULL;"
            connection.query(sql, function (err, result) {
                if (err) {
                    context.log(err);
                    callback(err, null);
                }
                if (result) {
                    context.log(result);
                    fs.unlinkSync(filepath);
                    context.log('unlinking temp file -->' + filepath);
                    async.series({
                        meterData: function (innercallback) {
                            updateMeterAlarmLatestDataWithPagination(innercallback);
                        },
                        transformerData: function (innercallback) {
                            updateHypersproutAlarmLatestDataWithPagination(context, innercallback);
                        },
                    }, function (err, results) {
                        if (err) {
                            context.log(err);
                            callback(err, null);
                        } else {
                            context.log(results)
                            callback(null, true);
                        }
                    });
                }
            });
        }
    });
}

function insertCsvtomysqlHS(context, filePathHsLatest, callback) {
    dbConMysql.pool.getConnection(function (err, connection) {
        if (err) {
            context.log("Error in GetConnection : " + err);
            callback(err, null);
        }
        else {
            var sql = "LOAD DATA LOCAL INFILE'" + filePathHsLatest + "' REPLACE INTO TABLE alarmseventstransformerlatest FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\r\n' IGNORE 1 LINES (`CellID`,`MeterSerialNumber` ,`CircuitID`,`HypersproutID`,`TransformerID`,`Meter_DeviceID`,`Phase`,`Status`,`AlarmsType`,`AlarmsValue`,`DBTimestamp`,`createdAt`,`updatedAt`);"
            connection.query(sql, function (err, result) {
                if (err) {
                    context.log(err);
                    callback(err, null);
                }
                if (result) {
                    context.log(result);
                    fs.unlinkSync(filePathHsLatest);
                    context.log('Unlinking the files---->' + filePathHsLatest);
                    callback(null, true);
                    //connection.end();
                }
            });
        }
    });
}


/**
* @description - Code to call function after time interval
* @param {Respose to be returned} callback
* @return - callback
*/
function checkAndCallCallbackAfterFinish(callback) {
    objTimerInterval = setInterval(function () {
        if (insertCallbackCount >= totalNoOfRecords) {
            insertCallbackCount = 0;
            totalNoOfRecords = 0;
            clearTimeout(objTimer);
            clearInterval(objTimerInterval);
            updateMeterAlarmLatestData();
            updateHypersproutAlarmLatestData();
            checkAndCallCallbackAfterLatestDataFinish(callback);
        }
    }, 1000);
}
/**
* @description - Code to call function after  time interval
* @param {Respose to be returned} callback
* @return - callback
*/
function checkAndCallCallbackAfterLatestDataFinish(callback) {
    objTimerInterval = setInterval(function () {
        if (insertCallbackCount >= totalNoOfRecords) {
            clearTimeout(objTimer);
            clearInterval(objTimerInterval);
            callback(null, true);
        }
    }, 1000);
}
/**
* @description - Code to update MEter latest alarms and events
* @return - Nil
*/
function updateMeterAlarmLatestData() {
    for (var objMeterDataKey in objLatestMeterData) {
        if (objLatestMeterData.hasOwnProperty(objMeterDataKey)) {
            var objMeterDetails = objLatestMeterData[objMeterDataKey];
            for (var i = 0; i < objConfig.arrMeterAlarmKey.length; i++) {
                var objDataToInsert = {};
                updateCommonKeysForLatestData(objMeterDetails, objDataToInsert);
                objDataToInsert.Meter_DeviceID = objMeterDetails.Meter_DeviceID;
                objDataToInsert.Phase = objMeterDetails.Meter_Phase;
                objDataToInsert.Status = objMeterDetails.Meter_Status;
                objDataToInsert.AlarmsType = objConfig.arrMeterAlarmKey[i];
                objDataToInsert.AlarmsValue = objMeterDetails[objConfig.arrMeterAlarmKey[i]] ? 1 : 0;
                objDataToInsert.DBTimestamp = objMeterDetails.DBTimestamp;
                insertRecordToAlarmAndEventTablesLatest(objDataToInsert);
            }
        }
    }
}

function updateMeterAlarmLatestDataWithPagination(callback) {
    var bulkLatestDataInsert = [];
    var latestInsertCount = 0;
    var latestNotToInsertCount = 0;
    for (var objMeterDataKey in objLatestMeterData) {
        // latestInsertCount++;
        if (objLatestMeterData.hasOwnProperty(objMeterDataKey)) {
            var objMeterDetails = objLatestMeterData[objMeterDataKey];
            if (objMeterDetails.Meter_DeviceID) {
                latestInsertCount++;
                for (var i = 0; i < objConfig.arrMeterAlarmKey.length; i++) {
                    var objDataToInsert = {};
                    updateCommonKeysForLatestData(objMeterDetails, objDataToInsert);
                    objDataToInsert.Meter_DeviceID = (objMeterDetails.Meter_DeviceID) ? objMeterDetails.Meter_DeviceID : 0;
                    objDataToInsert.Phase = (objMeterDetails.Meter_Phase) ? objMeterDetails.Meter_Phase : 0;
                    objDataToInsert.Status = (objMeterDetails.Meter_Status) ? objMeterDetails.Meter_Status : 0;
                    objDataToInsert.AlarmsType = objConfig.arrMeterAlarmKey[i];
                    objDataToInsert.DBTimestamp = objMeterDetails.DBTimestamp;
                    if (objMeterDetails.hasOwnProperty(objDataToInsert.AlarmsType)) {
                        objDataToInsert.AlarmsValue = objMeterDetails[objConfig.arrMeterAlarmKey[i]];
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else {
                        continue;
                    }
                }
            } else {
                latestNotToInsertCount++;
                continue;
            }

        }

    }
    if (latestInsertCount != 0 && bulkLatestDataInsert.length == (latestInsertCount * objConfig.arrMeterAlarmKey.length)) {
        objmysqldaoimpl.bulkInsert("alarmseventstransformerlatest", objtransformereventslatestmodel.objTransformerevents,
            objtransformereventslatestmodel.objTableProps,
            bulkLatestDataInsert, function () {
                console.log("Callback received updateMeterAlarmLatestDataWithPagination.");
                callback(null, true);
            });

    } else if (latestNotToInsertCount == 1 && bulkLatestDataInsert.length == 0) {
        callback(null, true);

    }
}
/**
* @description - Code to update Hypersprout latest alarms and events
* @return - Nil
*/
function updateHypersproutAlarmLatestData() {
    for (var objHSDataKey in objLatestHSData) {
        if (objLatestHSData.hasOwnProperty(objHSDataKey)) {
            var objHSDetails = objLatestHSData[objHSDataKey];
            for (var i = 0; i < objConfig.arrHypersproutAlarmKey.length; i++) {
                var objDataToInsert = {};
                updateCommonKeysForLatestData(objHSDetails, objDataToInsert);
                objDataToInsert.Phase = objHSDetails.Phase;
                objDataToInsert.Status = objHSDetails.StatusTransformer;
                objDataToInsert.AlarmsType = objConfig.arrHypersproutAlarmKey[i];
                objDataToInsert.AlarmsValue = objHSDetails[objConfig.arrHypersproutAlarmKey[i]] ? 1 : 0;
                objDataToInsert.DBTimestamp = objHSDetails.DBTimestamp;
                insertRecordToAlarmAndEventTablesLatest(objDataToInsert);
            }
        }
    }
}

function updateHypersproutAlarmLatestDataWithPagination(context, callback) {
    try {
        const fieldsHS = ['CellID', 'MeterSerialNumber', 'CircuitID', 'HypersproutID', 'TransformerID', 'Meter_DeviceID', 'Phase', 'Status', 'AlarmsType', 'AlarmsValue', 'DBTimestamp', 'createdAt', 'updatedAt']
        var bulkLatestDataInsert = [];
        var latestInsertCount = 0;
        if (Object.keys(objLatestHSData).length === 0) {
            callback(null, true);
        }
        for (var objHSDataKey in objLatestHSData) {
            latestInsertCount++;
            if (objLatestHSData.hasOwnProperty(objHSDataKey)) {
                var objHSDetails = objLatestHSData[objHSDataKey];
                for (var i = 0; i < objConfig.arrHypersproutAlarmKey.length; i++) {
                    var objDataToInsert = {};
                    updateCommonKeysForLatestDataHS(objHSDetails, objDataToInsert);
                    objDataToInsert.Meter_DeviceID = (objHSDetails.Meter_DeviceID) ? objHSDetails.Meter_DeviceID : 0;
                    objDataToInsert.Phase = (objHSDetails.Phase) ? objHSDetails.Phase : 0;
                    objDataToInsert.Status = (objHSDetails.StatusTransformer) ? objHSDetails.StatusTransformer : 0;
                    objDataToInsert.AlarmsType = objConfig.arrHypersproutAlarmKey[i];
                    objDataToInsert.DBTimestamp = objHSDetails.DBTimestamp;
                    var datetime = new Date(Date.now());
                    var now = datetime.toISOString();
                    objDataToInsert.createdAt = now;
                    objDataToInsert.updatedAt = now;
                    if (objDataToInsert.AlarmsType == "OverLoadLine1(MD Alarm)") {
                        objDataToInsert.AlarmsValue = objHSDetails["OverLoadLine1MDAlarm"] ? objHSDetails["OverLoadLine1MDAlarm"] : 0;
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else if (objDataToInsert.AlarmsType == "OverLoadLine2(MD Alarm)") {
                        objDataToInsert.AlarmsValue = objHSDetails["OverLoadLine2MDAlarm"] ? objHSDetails["OverLoadLine2MDAlarm"] : 0;
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else if (objDataToInsert.AlarmsType == "OverLoadLine3(MD Alarm)") {
                        objDataToInsert.AlarmsValue = objHSDetails["OverLoadLine3MDAlarm"] ? objHSDetails["OverLoadLine3MDAlarm"] : 0;
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else if (objDataToInsert.AlarmsType == "Non-TechnicalLoss") {
                        objDataToInsert.AlarmsValue = objHSDetails["NonTechnicalLoss"] ? objHSDetails["NonTechnicalLoss"] : 0;
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else if (objDataToInsert.AlarmsType == "Wi-FiCommunicationLoss") {
                        objDataToInsert.AlarmsValue = objHSDetails["WiFiCommunicationLoss"] ? objHSDetails["WiFiCommunicationLoss"] : 0;
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else if (objDataToInsert.AlarmsType == "3G/4G/LTECommunicationLoss") {
                        objDataToInsert.AlarmsValue = objHSDetails["threeG4GLTECommunicationLoss"] ? objHSDetails["threeG4GLTECommunicationLoss"] : 0;
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else 
                    if (objHSDetails.hasOwnProperty(objDataToInsert.AlarmsType)) {
                        objDataToInsert.AlarmsValue = objHSDetails[objConfig.arrHypersproutAlarmKey[i]];
                        bulkLatestDataInsert.push(objDataToInsert)
                    } else {
                        continue;

                    }
                }
            }
        }
        if (latestInsertCount != 0 && bulkLatestDataInsert.length == (latestInsertCount * objConfig.arrHypersproutAlarmKey.length)) {

            try {
                csv = json2csv(bulkLatestDataInsert, { fieldsHS });
            } catch (err) {
                context.log(err);
                callback(err, null);
            }

            fs.appendFile(filePathHsLatest, csv, function (err) {
                if (err) {
                    context.log(err);
                    callback(err, null);
                } else {
                    console.log("till updateHypersproutAlarmLatestDataWithPagination.");
                    //New implementation
                    objmysqldaoimpl.bulkInsert("alarmseventstransformerlatest", objtransformereventslatestmodel.objTransformerevents,
                        objtransformereventslatestmodel.objTableProps,
                        bulkLatestDataInsert, function () {
                            console.log("Callback received updateTransformerAlarmLatestDataWithPagination.");
                            callback(null, true);
                        });

                    //previous implementation

                    //insertCsvtomysqlHS(context, filePathHsLatest, callback);
                }
            });

        }
    } catch (err) {
        context.log(err);
        callback(err, null);
    }
}
/**
* @description - Code to update common keys used for  latest data
* @param objMeterDetails - meter details
* @param objDataToInsert - data to be inserted
* @return - Nil
*/
function updateCommonKeysForLatestData(objMeterDetails, objDataToInsert) {
    objDataToInsert.CellID = objMeterDetails.CellID;
    objDataToInsert.MeterSerialNumber = objMeterDetails.MeterSerialNumber;
    objDataToInsert.CircuitID = objMeterDetails.CircuitID;
    objDataToInsert.HypersproutID = objMeterDetails.HypersproutID;
    objDataToInsert.TransformerID = objMeterDetails.TransformerID;
    objDataToInsert["Meter_Demandresponseofexportactpwr(kW+)"] = objMeterDetails["Meter_Demandresponseofimportactpwr_kWpostive"];
    objDataToInsert["Meter_Demandresponseofexportactpwr(kW-)"] = objMeterDetails["Meter_Demandresponseofexportactpwr_kWnegative"];
    objDataToInsert["Meter_Demandresponseofimportreactpwr(kVar+)"] = objMeterDetails["Meter_Demandresponseofexportreactpwr_kVarpositive"]
    objDataToInsert["Meter_Demandresponseofexportreactpwr(kVar-)"] = objMeterDetails["Meter_Demandresponseofexportreactpwr_kVarnegative"]
}

function updateCommonKeysForLatestDataHS(objHSDetails, objDataToInsert) {
    objDataToInsert.CellID = objHSDetails.CellID;
    objDataToInsert.MeterSerialNumber = objHSDetails.MeterSerialNumber;
    objDataToInsert.CircuitID = objHSDetails.CircuitID;
    objDataToInsert.HypersproutID = objHSDetails.HypersproutID;
    objDataToInsert.TransformerID = objHSDetails.TransformerID;
   
}

/**
* @description - code to call function when certain count is reached
* @param arrTransformerTransData - transformer transaction data
* @return - Nil
*/
function interruptWhnDefinedCountReached(arrTransformerTransData) {
    if (countval % 200 === 0) {
        arrTransformerTransData.pause();
        objTimer = setTimeout(function () {
            arrTransformerTransData.resume();
        }, 500);
    }
}
/**
* @description - code to process  alarms transformer data
* @param meterTranItem - meter transaction item
* @param managerialData - managerial data
* @return - Nil
*/
function processAlarmTransformerData(meterTranItem, managerialData) {
    try {
        var objTranData = meterTranItem;
        var objToUpdate;
        if (objTranData.result && objTranData.result.meters) {
            for (var i = 0; i < objTranData.result.meters.length; i++) {
                var objMeterData = objTranData.result.meters[i];
                objToUpdate = updateValuesToInsert(objTranData, objMeterData);
                updateCircuitAndTrasformerData(managerialData, objToUpdate);
                objToUpdate.MeterSerialNumber = managerialData && managerialData.meterobj ? managerialData.meterobj[objToUpdate.Meter_DeviceID].MeterSerialNumber : null;
                objLatestMeterData[objToUpdate.Meter_DeviceID] = objToUpdate;
                insertRecordToAlarmAndEventTables(objToUpdate);
            }
            return;
        }
        if (objTranData.result) {
            objToUpdate = updateValuesToInsert(objTranData, null);
            updateCircuitAndTrasformerData(managerialData, objToUpdate);
            //objToUpdate.MeterSerialNumber = 'HyperSprout Alarm';
            objLatestHSData[objToUpdate.CellID] = objToUpdate;
            insertRecordToAlarmAndEventTables(objToUpdate);
            return;
        }
    } catch (err) {
        logger.log(err);
    }
}
/**
* @description - code to process  alarms transformer data
* @param meterTranItem - meter transaction item
* @param managerialData - managerial data
* @return - Nil
*/
function processAlarmTransformerDataWithPagination(meterTranItem, managerialData, bulkInsertArr, callback) {
    try {
        var objTranData = meterTranItem;
        var objToUpdate;
        if (objTranData.result && objTranData.result.meters) {
            var i;
            for (i = 0; i < objTranData.result.meters.length; i++) {

                var objMeterData = objTranData.result.meters[i];
                objToUpdate = updateValuesToInsert(objTranData, objMeterData);
                updateCircuitAndTrasformerData(managerialData, objToUpdate);
                // objToUpdate.MeterSerialNumber = managerialData && managerialData.meterobj ? managerialData.meterobj[objToUpdate.Meter_DeviceID].MeterSerialNumber : null;
                objToUpdate.MeterSerialNumber = null;
                objLatestMeterData[objToUpdate.Meter_DeviceID] = objToUpdate;
                var ReadTimestamp = (new Date(objToUpdate.ReadTimestamp)).toISOString();
                objToUpdate.ReadTimestamp = ReadTimestamp
                var DBTimestamp = (new Date(objToUpdate.DBTimestamp)).toISOString();
                objToUpdate.DBTimestamp = DBTimestamp;
                var Meter_ReadTimestamp = (new Date(objToUpdate.Meter_ReadTimestamp)).toISOString();

                objToUpdate.CircuitID = objToUpdate.CircuitID ? objToUpdate.CircuitID : 0;
                objToUpdate.HypersproutID = objToUpdate.HypersproutID ? objToUpdate.HypersproutID : 0;
                objToUpdate.TransformerID = objToUpdate.TransformerID ? objToUpdate.TransformerID : 0;
                objToUpdate.Meter_DeviceID = objToUpdate.Meter_DeviceID ? objToUpdate.Meter_DeviceID : 0;
                objToUpdate.Meter_Phase = objToUpdate.Meter_Phase ? objToUpdate.Meter_Phase : 0;
                objToUpdate.Meter_Status = objToUpdate.Meter_Status ? objToUpdate.Meter_Status : 0;
                objToUpdate.Meter_VoltageSagLine1 = objToUpdate.Meter_VoltageSagLine1 ? objToUpdate.Meter_VoltageSagLine1 : 0;
                objToUpdate.Meter_VoltageSagLine2 = objToUpdate.Meter_VoltageSagLine2 ? objToUpdate.Meter_VoltageSagLine2 : 0;
                objToUpdate.Meter_VoltageSagLine3 = objToUpdate.Meter_VoltageSagLine3 ? objToUpdate.Meter_VoltageSagLine3 : 0;
                objToUpdate.Meter_VoltageSwellLine1 = objToUpdate.Meter_VoltageSwellLine1 ? objToUpdate.Meter_VoltageSwellLine1 : 0;
                objToUpdate.Meter_VoltageSwellLine2 = objToUpdate.Meter_VoltageSwellLine2 ? objToUpdate.Meter_VoltageSwellLine2 : 0;
                objToUpdate.Meter_VoltageSwellLine3 = objToUpdate.Meter_VoltageSwellLine3 ? objToUpdate.Meter_VoltageSwellLine3 : 0;
                objToUpdate.Meter_VoltageUnbalance = objToUpdate.Meter_VoltageUnbalance ? objToUpdate.Meter_VoltageUnbalance : 0;
                objToUpdate.Meter_VoltageCablelossLine1 = objToUpdate.Meter_VoltageCablelossLine1 ? objToUpdate.Meter_VoltageCablelossLine1 : 0;
                objToUpdate.Meter_VoltageCablelossLine2 = objToUpdate.Meter_VoltageCablelossLine2 ? objToUpdate.Meter_VoltageCablelossLine2 : 0;
                objToUpdate.Meter_VoltageCablelossLine3 = objToUpdate.Meter_VoltageCablelossLine3 ? objToUpdate.Meter_VoltageCablelossLine3 : 0;
                objToUpdate.Meter_VoltageTHDOverLimitLine1 = objToUpdate.Meter_VoltageTHDOverLimitLine1 ? objToUpdate.Meter_VoltageTHDOverLimitLine1 : 0;
                objToUpdate.Meter_VoltageTHDOverLimitLine2 = objToUpdate.Meter_VoltageTHDOverLimitLine2 ? objToUpdate.Meter_VoltageTHDOverLimitLine2 : 0;
                objToUpdate.Meter_VoltageTHDOverLimitLine3 = objToUpdate.Meter_VoltageTHDOverLimitLine3 ? objToUpdate.Meter_VoltageTHDOverLimitLine3 : 0;
                objToUpdate.Meter_CurrentTHDOverLimitLine1 = objToUpdate.Meter_CurrentTHDOverLimitLine1 ? objToUpdate.Meter_CurrentTHDOverLimitLine1 : 0;
                objToUpdate.Meter_CurrentTHDOverLimitLine2 = objToUpdate.Meter_CurrentTHDOverLimitLine2 ? objToUpdate.Meter_CurrentTHDOverLimitLine2 : 0;
                objToUpdate.Meter_CurrentTHDOverLimitLine3 = objToUpdate.Meter_CurrentTHDOverLimitLine3 ? objToUpdate.Meter_CurrentTHDOverLimitLine3 : 0;
                objToUpdate.Meter_PrimaryPowerUp = objToUpdate.Meter_PrimaryPowerUp ? objToUpdate.Meter_PrimaryPowerUp : 0;
                objToUpdate.Meter_PrimaryPowerDown = objToUpdate.Meter_PrimaryPowerDown ? objToUpdate.Meter_PrimaryPowerDown : 0;
                objToUpdate.Meter_LongOutagedetection = objToUpdate.Meter_LongOutagedetection ? objToUpdate.Meter_LongOutagedetection : 0;
                objToUpdate.Meter_ShortOutagedetection = objToUpdate.Meter_ShortOutagedetection ? objToUpdate.Meter_ShortOutagedetection : 0;
                objToUpdate.Meter_LowBatteryVoltage = objToUpdate.Meter_NonvolatileMemoryFailed ? objToUpdate.Meter_NonvolatileMemoryFailed : 0;
                objToUpdate.Meter_NonvolatileMemoryFailed = objToUpdate.Meter_NonvolatileMemoryFailed ? objToUpdate.Meter_NonvolatileMemoryFailed : 0;
                objToUpdate.Meter_Clockerrordetected = objToUpdate.Meter_Clockerrordetected ? objToUpdate.Meter_Clockerrordetected : 0;
                objToUpdate.Meter_LowBatteryVoltage = objToUpdate.Meter_LowBatteryVoltage ? objToUpdate.Meter_LowBatteryVoltage : 0;
                objToUpdate.Meter_FlashMemoryFailed = objToUpdate.Meter_FlashMemoryFailed ? objToUpdate.Meter_FlashMemoryFailed : 0;
                objToUpdate.Meter_Firmwareupgraded = objToUpdate.Meter_Firmwareupgraded ? objToUpdate.Meter_Firmwareupgraded : 0;
                objToUpdate.Meter_Demandreset = objToUpdate.Meter_Demandreset ? objToUpdate.Meter_Demandreset : 0;
                objToUpdate.Meter_TimeSynchronized = objToUpdate.Meter_TimeSynchronized ? objToUpdate.Meter_TimeSynchronized : 0;
                objToUpdate.Meter_Historylogcleared = objToUpdate.Meter_Historylogcleared ? objToUpdate.Meter_Historylogcleared : 0;
                objToUpdate.Meter_Coverremoval = objToUpdate.Meter_Coverremoval ? objToUpdate.Meter_Coverremoval : 0;
                objToUpdate.Meter_Terminalcoverremoval = objToUpdate.Meter_Terminalcoverremoval ? objToUpdate.Meter_Terminalcoverremoval : 0;
                objToUpdate.Meter_MeterDisconnected = objToUpdate.Meter_MeterDisconnected ? objToUpdate.Meter_MeterDisconnected : 0;
                objToUpdate.Meter_MeterConnected = objToUpdate.Meter_MeterConnected ? objToUpdate.Meter_MeterConnected : 0;
                objToUpdate.Phase = objToUpdate.Phase ? objToUpdate.Phase : 0;
                objToUpdate.OverVoltage = objToUpdate.OverVoltage ? objToUpdate.OverVoltage : 0;
                objToUpdate.UnderVoltage = objToUpdate.UnderVoltage ? objToUpdate.UnderVoltage : 0;
                objToUpdate.UnderVoltage = objToUpdate.UnderVoltage ? objToUpdate.UnderVoltage : 0;
                objToUpdate.OverLoadLine1MDAlarm = objToUpdate.OverLoadLine1MDAlarm ? objToUpdate.OverLoadLine1MDAlarm : 0;
                objToUpdate.OverLoadLine2MDAlarm = objToUpdate.OverLoadLine2MDAlarm ? objToUpdate.OverLoadLine2MDAlarm : 0;
                objToUpdate.OverLoadLine3MDAlarm = objToUpdate.OverLoadLine3MDAlarm ? objToUpdate.OverLoadLine3MDAlarm : 0;
                objToUpdate.OverFrequency = objToUpdate.OverFrequency ? objToUpdate.OverFrequency : 0;
                objToUpdate.UnderFrequency = objToUpdate.UnderFrequency ? objToUpdate.UnderFrequency : 0;
                objToUpdate.PowerFailure = objToUpdate.PowerFailure ? objToUpdate.PowerFailure : 0;
                objToUpdate.CTOpen = objToUpdate.CTOpen ? objToUpdate.CTOpen : 0;
                objToUpdate.PTOpen = objToUpdate.PTOpen ? objToUpdate.PTOpen : 0;
                objToUpdate.OilLevelSensorFailure = objToUpdate.OilLevelSensorFailure ? objToUpdate.OilLevelSensorFailure : 0;
                objToUpdate.TamperLid = objToUpdate.TamperLid ? objToUpdate.TamperLid : 0;
                objToUpdate.TamperBox = objToUpdate.TamperBox ? objToUpdate.TamperBox : 0;
                objToUpdate.LowOilLevel = objToUpdate.LowOilLevel ? objToUpdate.LowOilLevel : 0;
                objToUpdate.HighOilTemperature = objToUpdate.HighOilTemperature ? objToUpdate.HighOilTemperature : 0;
                objToUpdate.LowBatteryVoltage = objToUpdate.LowBatteryVoltage ? objToUpdate.LowBatteryVoltage : 0;
                objToUpdate.BatteryFailure = objToUpdate.BatteryFailure ? objToUpdate.BatteryFailure : 0;
                objToUpdate.BatteryRemoved = objToUpdate.BatteryRemoved ? objToUpdate.BatteryRemoved : 0;
                objToUpdate.PrimaryPowerUp = objToUpdate.PrimaryPowerUp ? objToUpdate.PrimaryPowerUp : 0;
                objToUpdate.PrimaryPowerDown = objToUpdate.PrimaryPowerDown ? objToUpdate.PrimaryPowerDown : 0;
                objToUpdate.NonTechnicalLoss = objToUpdate.NonTechnicalLoss ? objToUpdate.NonTechnicalLoss : 0;
                objToUpdate.MeterConnected = objToUpdate.MeterConnected ? objToUpdate.MeterConnected : 0;
                objToUpdate.MeterDisconnected = objToUpdate.MeterDisconnected ? objToUpdate.MeterDisconnected : 0;
                objToUpdate.LowOilLevel = objToUpdate.LowOilLevel ? objToUpdate.LowOilLevel : 0;
                objToUpdate.WiFiCommunicationLoss = objToUpdate.WiFiCommunicationLoss ? objToUpdate.WiFiCommunicationLoss : 0;
                objToUpdate.threeG4GLTECommunicationLoss = objToUpdate.threeG4GLTECommunicationLoss ? objToUpdate.threeG4GLTECommunicationLoss : 0;
                objToUpdate.Communicationattemptsexceeded = objToUpdate.Communicationattemptsexceeded ? objToUpdate.Communicationattemptsexceeded : 0;
                objToUpdate.UnAuthenticatedConnectionRequest = objToUpdate.UnAuthenticatedConnectionRequest ? objToUpdate.UnAuthenticatedConnectionRequest : 0;
                objToUpdate.Meter_Demandresponseofimportactpwr_kWpostive = 0;
                objToUpdate.Meter_Demandresponseofexportactpwr_kWnegative = 0;
                objToUpdate.Meter_Demandresponseofexportreactpwr_kVarpositive = 0;
                objToUpdate.Meter_Demandresponseofexportreactpwr_kVarnegative = 0;
                var datetime = new Date(Date.now());
                var now = datetime.toISOString();
                objToUpdate.Meter_ReadTimestamp = now
                objToUpdate.createdAt = now;
                objToUpdate.updatedAt = now;
                bulkInsertArr.push(objToUpdate);
            }
            if (i == objTranData.result.meters.length) {
                callback(bulkInsertArr);
            }
        }
        else if (objTranData.result && !objTranData.result.meters) {
            objToUpdate = updateValuesToInsert(objTranData, null);
            updateCircuitAndTrasformerData(managerialData, objToUpdate);
            // objToUpdate.MeterSerialNumber = 'HyperSprout Alarm';
            objToUpdate.MeterSerialNumber = null;
            objLatestHSData[objToUpdate.CellID] = objToUpdate;
            var ReadTimestamp = (new Date(objToUpdate.ReadTimestamp)).toISOString();
            objToUpdate.ReadTimestamp = ReadTimestamp
            var DBTimestamp = (new Date(objToUpdate.DBTimestamp)).toISOString();
            objToUpdate.DBTimestamp = DBTimestamp
            objToUpdate.CircuitID = objToUpdate.CircuitID ? objToUpdate.CircuitID : 0;
            objToUpdate.HypersproutID = objToUpdate.HypersproutID ? objToUpdate.HypersproutID : 0;
            objToUpdate.TransformerID = objToUpdate.TransformerID ? objToUpdate.TransformerID : 0;
            objToUpdate.Meter_DeviceID = objToUpdate.Meter_DeviceID ? objToUpdate.Meter_DeviceID : 0;
            objToUpdate.Meter_Phase = objToUpdate.Meter_Phase ? objToUpdate.Meter_Phase : 0;
            objToUpdate.Meter_Status = objToUpdate.Meter_Status ? objToUpdate.Meter_Status : 0;
            //objToUpdate.Meter_ReadTimestamp = Meter_ReadTimestamp;
            objToUpdate.Meter_VoltageSagLine1 = objToUpdate.Meter_VoltageSagLine1 ? objToUpdate.Meter_VoltageSagLine1 : 0;
            objToUpdate.Meter_VoltageSagLine2 = objToUpdate.Meter_VoltageSagLine2 ? objToUpdate.Meter_VoltageSagLine2 : 0;
            objToUpdate.Meter_VoltageSagLine3 = objToUpdate.Meter_VoltageSagLine3 ? objToUpdate.Meter_VoltageSagLine3 : 0;
            objToUpdate.Meter_VoltageSwellLine1 = objToUpdate.Meter_VoltageSwellLine1 ? objToUpdate.Meter_VoltageSwellLine1 : 0;
            objToUpdate.Meter_VoltageSwellLine2 = objToUpdate.Meter_VoltageSwellLine2 ? objToUpdate.Meter_VoltageSwellLine2 : 0;
            objToUpdate.Meter_VoltageSwellLine3 = objToUpdate.Meter_VoltageSwellLine3 ? objToUpdate.Meter_VoltageSwellLine3 : 0;
            objToUpdate.Meter_VoltageUnbalance = objToUpdate.Meter_VoltageUnbalance ? objToUpdate.Meter_VoltageUnbalance : 0;
            objToUpdate.Meter_VoltageCablelossLine1 = objToUpdate.Meter_VoltageCablelossLine1 ? objToUpdate.Meter_VoltageCablelossLine1 : 0;
            objToUpdate.Meter_VoltageCablelossLine2 = objToUpdate.Meter_VoltageCablelossLine2 ? objToUpdate.Meter_VoltageCablelossLine2 : 0;
            objToUpdate.Meter_VoltageCablelossLine3 = objToUpdate.Meter_VoltageCablelossLine3 ? objToUpdate.Meter_VoltageCablelossLine3 : 0;
            objToUpdate.Meter_VoltageTHDOverLimitLine1 = objToUpdate.Meter_VoltageTHDOverLimitLine1 ? objToUpdate.Meter_VoltageTHDOverLimitLine1 : 0;
            objToUpdate.Meter_VoltageTHDOverLimitLine2 = objToUpdate.Meter_VoltageTHDOverLimitLine2 ? objToUpdate.Meter_VoltageTHDOverLimitLine2 : 0;
            objToUpdate.Meter_VoltageTHDOverLimitLine3 = objToUpdate.Meter_VoltageTHDOverLimitLine3 ? objToUpdate.Meter_VoltageTHDOverLimitLine3 : 0;
            objToUpdate.Meter_CurrentTHDOverLimitLine1 = objToUpdate.Meter_CurrentTHDOverLimitLine1 ? objToUpdate.Meter_CurrentTHDOverLimitLine1 : 0;
            objToUpdate.Meter_CurrentTHDOverLimitLine2 = objToUpdate.Meter_CurrentTHDOverLimitLine2 ? objToUpdate.Meter_CurrentTHDOverLimitLine2 : 0;
            objToUpdate.Meter_CurrentTHDOverLimitLine3 = objToUpdate.Meter_CurrentTHDOverLimitLine3 ? objToUpdate.Meter_CurrentTHDOverLimitLine3 : 0;
            objToUpdate.Meter_PrimaryPowerUp = objToUpdate.Meter_PrimaryPowerUp ? objToUpdate.Meter_PrimaryPowerUp : 0;
            objToUpdate.Meter_PrimaryPowerDown = objToUpdate.Meter_PrimaryPowerDown ? objToUpdate.Meter_PrimaryPowerDown : 0;
            objToUpdate.Meter_LongOutagedetection = objToUpdate.Meter_LongOutagedetection ? objToUpdate.Meter_LongOutagedetection : 0;
            objToUpdate.Meter_ShortOutagedetection = objToUpdate.Meter_ShortOutagedetection ? objToUpdate.Meter_ShortOutagedetection : 0;
            objToUpdate.Meter_LowBatteryVoltage = objToUpdate.Meter_NonvolatileMemoryFailed ? objToUpdate.Meter_NonvolatileMemoryFailed : 0;
            objToUpdate.Meter_NonvolatileMemoryFailed = objToUpdate.Meter_NonvolatileMemoryFailed ? objToUpdate.Meter_NonvolatileMemoryFailed : 0;
            objToUpdate.Meter_Clockerrordetected = objToUpdate.Meter_Clockerrordetected ? objToUpdate.Meter_Clockerrordetected : 0;
            objToUpdate.Meter_LowBatteryVoltage = objToUpdate.Meter_LowBatteryVoltage ? objToUpdate.Meter_LowBatteryVoltage : 0;
            objToUpdate.Meter_FlashMemoryFailed = objToUpdate.Meter_FlashMemoryFailed ? objToUpdate.Meter_FlashMemoryFailed : 0;
            objToUpdate.Meter_Firmwareupgraded = objToUpdate.Meter_Firmwareupgraded ? objToUpdate.Meter_Firmwareupgraded : 0;
            objToUpdate.Meter_Demandreset = objToUpdate.Meter_Demandreset ? objToUpdate.Meter_Demandreset : 0;
            objToUpdate.Meter_TimeSynchronized = objToUpdate.Meter_TimeSynchronized ? objToUpdate.Meter_TimeSynchronized : 0;
            objToUpdate.Meter_Historylogcleared = objToUpdate.Meter_Historylogcleared ? objToUpdate.Meter_Historylogcleared : 0;
            objToUpdate.Meter_Coverremoval = objToUpdate.Meter_Coverremoval ? objToUpdate.Meter_Coverremoval : 0;
            objToUpdate.Meter_Terminalcoverremoval = objToUpdate.Meter_Terminalcoverremoval ? objToUpdate.Meter_Terminalcoverremoval : 0;
            objToUpdate.Meter_MeterDisconnected = objToUpdate.Meter_MeterDisconnected ? objToUpdate.Meter_MeterDisconnected : 0;
            objToUpdate.Meter_MeterConnected = objToUpdate.Meter_MeterConnected ? objToUpdate.Meter_MeterConnected : 0;
            objToUpdate.Phase = objToUpdate.Phase ? objToUpdate.Phase : 0;
            objToUpdate.OverVoltage = objToUpdate.OverVoltage ? objToUpdate.OverVoltage : 0;
            objToUpdate.UnderVoltage = objToUpdate.UnderVoltage ? objToUpdate.UnderVoltage : 0;
            objToUpdate.UnderFrequency = objToUpdate.UnderFrequency ? objToUpdate.UnderFrequency : 0;
            objToUpdate.PowerFailure = objToUpdate.PowerFailure ? objToUpdate.PowerFailure : 0;
            objToUpdate.CTOpen = objToUpdate.CTOpen ? objToUpdate.CTOpen : 0;
            objToUpdate.PTOpen = objToUpdate.PTOpen ? objToUpdate.PTOpen : 0;
            objToUpdate.OverFrequency = objToUpdate.OverFrequency ? objToUpdate.OverFrequency : 0;
            objToUpdate.TamperLid = objToUpdate.TamperLid ? objToUpdate.TamperLid : 0;
            objToUpdate.TamperBox = objToUpdate.TamperBox ? objToUpdate.TamperBox : 0;
            objToUpdate.LowOilLevel = objToUpdate.LowOilLevel ? objToUpdate.LowOilLevel : 0;
            objToUpdate.HighOilTemperature = objToUpdate.HighOilTemperature ? objToUpdate.HighOilTemperature : 0;
            objToUpdate.LowBatteryVoltage = objToUpdate.LowBatteryVoltage ? objToUpdate.LowBatteryVoltage : 0;
            objToUpdate.BatteryFailure = objToUpdate.BatteryFailure ? objToUpdate.BatteryFailure : 0;
            objToUpdate.BatteryRemoved = objToUpdate.BatteryRemoved ? objToUpdate.BatteryRemoved : 0;
            objToUpdate.PrimaryPowerUp = objToUpdate.PrimaryPowerUp ? objToUpdate.PrimaryPowerUp : 0;
            objToUpdate.PrimaryPowerDown = objToUpdate.PrimaryPowerDown ? objToUpdate.PrimaryPowerDown : 0;
            objToUpdate.NonTechnicalLoss = objToUpdate.NonTechnicalLoss ? objToUpdate.NonTechnicalLoss : 0;
            objToUpdate.MeterConnected = objToUpdate.MeterConnected ? objToUpdate.MeterConnected : 0;
            objToUpdate.LowOilLevel = objToUpdate.LowOilLevel ? objToUpdate.LowOilLevel : 0;
            objToUpdate.WiFiCommunicationLoss = objToUpdate.WiFiCommunicationLoss ? objToUpdate.WiFiCommunicationLoss : 0;
            objToUpdate.MeterDisconnected = objToUpdate.MeterDisconnected ? objToUpdate.MeterDisconnected : 0;
            objToUpdate.threeG4GLTECommunicationLoss = objToUpdate.threeG4GLTECommunicationLoss ? objToUpdate.threeG4GLTECommunicationLoss : 0;
            objToUpdate.Communicationattemptsexceeded = objToUpdate.Communicationattemptsexceeded ? objToUpdate.Communicationattemptsexceeded : 0;
            objToUpdate.UnAuthenticatedConnectionRequest = objToUpdate.UnAuthenticatedConnectionRequest ? objToUpdate.UnAuthenticatedConnectionRequest : 0;
            objToUpdate.OilLevelSensorFailure = objToUpdate.OilLevelSensorFailure ? objToUpdate.OilLevelSensorFailure : 0;
            objToUpdate.OverLoadLine1MDAlarm = objToUpdate.OverLoadLine1MDAlarm ? objToUpdate.OverLoadLine1MDAlarm : 0;
            objToUpdate.OverLoadLine2MDAlarm = objToUpdate.OverLoadLine2MDAlarm ? objToUpdate.OverLoadLine2MDAlarm : 0;
            objToUpdate.OverLoadLine3MDAlarm = objToUpdate.OverLoadLine3MDAlarm ? objToUpdate.OverLoadLine3MDAlarm : 0;
            objToUpdate.Meter_Demandresponseofimportactpwr_kWpostive = 0;
            objToUpdate.Meter_Demandresponseofexportactpwr_kWnegative = 0;
            objToUpdate.Meter_Demandresponseofexportreactpwr_kVarpositive = 0;
            objToUpdate.Meter_Demandresponseofexportreactpwr_kVarnegative = 0;
            var datetime = new Date(Date.now());
            var now = datetime.toISOString();
            objToUpdate.createdAt = now;
            objToUpdate.updatedAt = now;
            objToUpdate.Meter_ReadTimestamp = now;
            bulkInsertArr.push(objToUpdate);
            callback(bulkInsertArr);
        }

    } catch (err) {
        logger.log(err);
    }
}
/**
* @description - code to update value to be inserted
* @param objTranData -  transaction item
* @param objMeterData - meter data
* @return - Nil
*/
function updateValuesToInsert(objTranData, objMeterData) {
    var objToUpdate = {};
    objjsFunctions.assignValuesFrmObject(objTranData.result, objToUpdate, '', [], true, false);
    objjsFunctions.assignValuesFrmObject(objTranData, objToUpdate, '', ["DBTimestamp"], false, false);
    delete objToUpdate.Transformer;
    delete objToUpdate.meters;
    if (objMeterData) {
        objjsFunctions.assignValuesFrmObject(objMeterData, objToUpdate, 'Meter_', [], true, false);
        objToUpdate.Meter_ReadTimestamp = objToUpdate.Meter_ReadTimestamp ? moment(objToUpdate.Meter_ReadTimestamp, 'DD-MM-YYYY HH:mm:ss').utc() : null;
    }
    objjsFunctions.assignValuesFrmObject(objTranData.result.Transformer, objToUpdate, '', [], true, false);
    objToUpdate.ReadTimestamp = objToUpdate.ReadTimestamp ? moment(objToUpdate.ReadTimestamp, 'DD-MM-YYYY HH:mm:ss').utc() : null;
    objToUpdate.DBTimestamp = objToUpdate.DBTimestamp ? moment(objToUpdate.DBTimestamp, 'DD-MM-YYYY HH:mm:ss').utc() : null;
    return objToUpdate;
}
/**
* @description - code to update circuit and transformer data
* @param managerialData -  managerial data
* @param objToUpdate - data to be updated
* @return - Nil
*/
function updateCircuitAndTrasformerData(managerialData, objToUpdate) {
    if (managerialData && managerialData.transformerobj && managerialData.transformerobj[objToUpdate.CellID]) {
        objToUpdate.CircuitID = managerialData.transformerobj[objToUpdate.CellID].CircuitID;
        objToUpdate.TransformerID = managerialData.transformerobj[objToUpdate.CellID].TransformerSerialNumber;
        objToUpdate.HypersproutID = managerialData.transformerobj[objToUpdate.CellID].HypersproutSerialNumber;
    }
}
/**
* @description - code to insert alarms data to alarmsandevent table
* @param objDataToInsert -  data to be inserted
* @return - Nil
*/
function insertRecordToAlarmAndEventTables(objDataToInsert) {
    objmysqldaoimpl.insertData("alarmseventstransformer", objtransformereventsmodel.objTransformerevents,
        objtransformereventsmodel.objTableProps,
        objDataToInsert, insertDataCallback);
    totalNoOfRecords += 1;
}
/**
* @description - code to insert latest alarms data to latestalarmsandevent table
* @param objDataToInsert -  data to be inserted
* @return - Nil
*/
function insertRecordToAlarmAndEventTablesLatest(objDataToInsert) {
    objmysqldaoimpl.insertData("alarmseventstransformerlatest", objtransformereventslatestmodel.objTransformerevents,
        objtransformereventslatestmodel.objTableProps,
        objDataToInsert, insertDataCallback);
    totalNoOfRecords += 1;
}
/**
* @description - code to insert data
* @param - error
* @return - Nil
*/
function insertDataCallback(err) {
    if (err) {
        logger.log("Error", err);
    }
    insertCallbackCount++;
}


// function to get Filter Alarms  

function getAlrmsConfigDetails(hypersproutSerialNumber, meterIDs, bulkInsertArr3, callback) {

    let bulkInsertArr1 = bulkInsertArr3.sort(function (a, b) {
        var keyA = new Date(a.DBTimestamp),
            keyB = new Date(b.DBTimestamp);
        // Compare the 2 dates
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    });

    let hsCondition = { HypersproutSerialNumber: { $in: hypersproutSerialNumber } }
    let meterCondition = { MeterID: { $in: meterIDs }, "DeviceType": "meter" }
    let bulkInsertArr = [];
    let dataToInsert = {};
    let finalbulkArr = [];
    let dataToInsert1 = {};
    try {
        objdaoimpl.fetchData("HyperSprout", hsCondition, function (err, hsDetails) {
            if (err || hsDetails.length == 0) {
                bulkInsertArr1.forEach(function (bulkInsert) {
                    if (bulkInsert.NoOfMeter == 0 || bulkInsert.NoOfMeter == "0" || !bulkInsert.NoOfMeter)
                        objLatestHSData[bulkInsert.CellID] = bulkInsert;
                    bulkInsertArr.push(bulkInsert)
                })
            }
            else {
                bulkInsertArr1.map(bulkInsert => {
                    hsDetail = hsDetails.find(hsDetail => hsDetail.HypersproutSerialNumber === bulkInsert.HypersproutID);
                    if (hsDetail) {
                        dataToInsert = {
                            Rev: bulkInsert.Rev,
                            Count: bulkInsert.Count,
                            MessageID: bulkInsert.MessageID,
                            CountryCode: bulkInsert.CountryCode,
                            RegionCode: bulkInsert.RegionCode,
                            CellID: bulkInsert.CellID,
                            MeterID: bulkInsert.MeterID,
                            Type: bulkInsert.Type,
                            Action: bulkInsert.Action,
                            Attribute: bulkInsert.Attribute,
                            DBTimestamp: bulkInsert.DBTimestamp,
                            Meter_DeviceID: bulkInsert.Meter_DeviceID,
                            Meter_Phase: bulkInsert.Meter_Phase,
                            Meter_Status: bulkInsert.Meter_Status,
                            Meter_ReadTimestamp: bulkInsert.Meter_ReadTimestamp,
                            Meter_VoltageSagLine1: bulkInsert.Meter_VoltageSagLine1,
                            Meter_VoltageSagLine2: bulkInsert.Meter_VoltageSagLine2,
                            Meter_VoltageSagLine3: bulkInsert.Meter_VoltageSagLine3,
                            Meter_VoltageSwellLine1: bulkInsert.Meter_VoltageSwellLine1,
                            Meter_VoltageSwellLine2: bulkInsert.Meter_VoltageSwellLine2,
                            Meter_VoltageSwellLine3: bulkInsert.Meter_VoltageSwellLine3,
                            Meter_VoltageUnbalance: bulkInsert.Meter_VoltageUnbalance,
                            Meter_VoltageCablelossLine1: bulkInsert.Meter_VoltageCablelossLine1,
                            Meter_VoltageCablelossLine2: bulkInsert.Meter_VoltageCablelossLine2,
                            Meter_VoltageCablelossLine3: bulkInsert.Meter_VoltageCablelossLine3,
                            Meter_VoltageTHDOverLimitLine1: bulkInsert.Meter_VoltageTHDOverLimitLine1,
                            Meter_VoltageTHDOverLimitLine2: bulkInsert.Meter_VoltageTHDOverLimitLine2,
                            Meter_VoltageTHDOverLimitLine3: bulkInsert.Meter_VoltageTHDOverLimitLine3,
                            Meter_CurrentTHDOverLimitLine1: bulkInsert.Meter_CurrentTHDOverLimitLine1,
                            Meter_CurrentTHDOverLimitLine2: bulkInsert.Meter_CurrentTHDOverLimitLine2,
                            Meter_CurrentTHDOverLimitLine3: bulkInsert.Meter_CurrentTHDOverLimitLine3,
                            Meter_PrimaryPowerUp: bulkInsert.Meter_PrimaryPowerUp,
                            Meter_PrimaryPowerDown: bulkInsert.Meter_PrimaryPowerDown,
                            Meter_LongOutagedetection: bulkInsert.Meter_LongOutagedetection,
                            Meter_ShortOutagedetection: bulkInsert.Meter_ShortOutagedetection,
                            Meter_NonvolatileMemoryFailed: bulkInsert.Meter_NonvolatileMemoryFailed,
                            Meter_Clockerrordetected: bulkInsert.Meter_Clockerrordetected,
                            Meter_LowBatteryVoltage: bulkInsert.Meter_LowBatteryVoltage,
                            Meter_FlashMemoryFailed: bulkInsert.Meter_FlashMemoryFailed,
                            Meter_Firmwareupgraded: bulkInsert.Meter_Firmwareupgraded,
                            Meter_Demandreset: bulkInsert.Meter_Demandreset,
                            Meter_TimeSynchronized: bulkInsert.Meter_TimeSynchronized,
                            Meter_Historylogcleared: bulkInsert.Meter_Historylogcleared,
                            Meter_Coverremoval: bulkInsert.Meter_Coverremoval,
                            Meter_Terminalcoverremoval: bulkInsert.Meter_Terminalcoverremoval,
                            Meter_MeterDisconnected: bulkInsert.Meter_MeterDisconnected,
                            Meter_MeterConnected: bulkInsert.Meter_MeterConnected,
                            'Meter_Demandresponseofimportactpwr(kW+)': bulkInsert["Meter_Demandresponseofimportactpwr(kW+)"],
                            'Meter_Demandresponseofexportactpwr(kW-)': bulkInsert["Meter_Demandresponseofexportactpwr(kW-)"],
                            'Meter_Demandresponseofimportreactpwr(kVar+)': bulkInsert["Meter_Demandresponseofimportreactpwr(kVar+)"],
                            'Meter_Demandresponseofexportreactpwr(kVar-)': bulkInsert["Meter_Demandresponseofexportreactpwr(kVar-)"],
                            NoOfMeter: bulkInsert.NoOfMeter,
                            StatusTransformer: bulkInsert.StatusTransformer,
                            ReadTimestamp: bulkInsert.ReadTimestamp,
                            CircuitID: bulkInsert.CircuitID,
                            TransformerID: bulkInsert.TransformerID,
                            HypersproutID: bulkInsert.HypersproutID,
                            MeterSerialNumber: bulkInsert.MeterSerialNumber,
                            Phase: hsDetail.Phase,
                            OverVoltage: (hsDetail.Alarm.OverVoltage == bulkInsert.OverVoltage) ? bulkInsert.OverVoltage : 0,
                            UnderVoltage: (hsDetail.Alarm.UnderVoltage == bulkInsert.UnderVoltage) ? bulkInsert.UnderVoltage : 0,
                            OverLoadLine1MDAlarm: (hsDetail.Alarm.OverLoadLine1MDAlarm == bulkInsert.OverLoadLine1MDAlarm) ? bulkInsert.OverLoadLine1MDAlarm : 0,
                            OverLoadLine2MDAlarm: (hsDetail.Alarm.OverLoadLine2MDAlarm == bulkInsert.OverLoadLine2MDAlarm) ? bulkInsert.OverLoadLine2MDAlarm : 0,
                            OverLoadLine3MDAlarm: (hsDetail.Alarm.OverLoadLine3MDAlarm == bulkInsert.OverLoadLine3MDAlarm) ? bulkInsert.OverLoadLine3MDAlarm : 0,
                            OverFrequency: (hsDetail.Alarm.OverFrequency == bulkInsert.OverFrequency) ? bulkInsert.OverFrequency : 0,
                            UnderFrequency: (hsDetail.Alarm.UnderFrequency == bulkInsert.UnderFrequency) ? bulkInsert.UnderFrequency : 0,
                            PowerFailure: (hsDetail.Alarm.PowerFailure == bulkInsert.PowerFailure) ? bulkInsert.PowerFailure : 0,
                            CTOpen: (hsDetail.Alarm.CTOpen == bulkInsert.CTOpen) ? bulkInsert.CTOpen : 0,
                            PTOpen: (hsDetail.Alarm.PTOpen == bulkInsert.PTOpen) ? bulkInsert.PTOpen : 0,
                            OilLevelSensorFailure: (hsDetail.Alarm.OilLevelSensorFailure == bulkInsert.OilLevelSensorFailure) ? bulkInsert.OilLevelSensorFailure : 0,
                            TamperLid: (hsDetail.Alarm.TamperLid == bulkInsert.TamperLid) ? bulkInsert.TamperLid : 0,
                            TamperBox: (hsDetail.Alarm.TamperBox == bulkInsert.TamperBox) ? bulkInsert.TamperBox : 0,
                            LowOilLevel: (hsDetail.Alarm.LowOilLevel == bulkInsert.LowOilLevel) ? bulkInsert.LowOilLevel : 0,
                            HighOilTemperature: (hsDetail.Alarm.HighOilTemperature == bulkInsert.HighOilTemperature) ? bulkInsert.HighOilTemperature : 0,
                            LowBatteryVoltage: (hsDetail.Alarm.LowBatteryVoltage == bulkInsert.LowBatteryVoltage) ? bulkInsert.LowBatteryVoltage : 0,
                            BatteryFailure: (hsDetail.Alarm.BatteryFailure == bulkInsert.BatteryFailure) ? bulkInsert.BatteryFailure : 0,
                            BatteryRemoved: (hsDetail.Alarm.BatteryRemoved == bulkInsert.BatteryRemoved) ? bulkInsert.BatteryRemoved : 0,
                            PrimaryPowerUp: (hsDetail.Alarm.PrimaryPowerUp == bulkInsert.PrimaryPowerUp) ? bulkInsert.PrimaryPowerUp : 0,
                            PrimaryPowerDown: (hsDetail.Alarm.PrimaryPowerDown == bulkInsert.PrimaryPowerDown) ? bulkInsert.PrimaryPowerDown : 0,
                            NonTechnicalLoss: (hsDetail.Alarm.NonTechnicalLoss == bulkInsert.NonTechnicalLoss) ? bulkInsert.NonTechnicalLoss : 0,
                            MeterConnected: (hsDetail.Alarm.MeterConnected == bulkInsert.MeterConnected) ? bulkInsert.MeterConnected : 0,
                            MeterDisconnected: (hsDetail.Alarm.MeterDisconnected == bulkInsert.MeterDisconnected) ? bulkInsert.MeterDisconnected : 0,
                            WiFiCommunicationLoss: (hsDetail.Alarm.WiFiCommunicationLoss == bulkInsert.WiFiCommunicationLoss) ? bulkInsert.WiFiCommunicationLoss : 0,
                            threeG4GLTECommunicationLoss: (hsDetail.Alarm.threeG4GLTECommunicationLoss == bulkInsert.threeG4GLTECommunicationLoss) ? bulkInsert.threeG4GLTECommunicationLoss : 0,
                            Communicationattemptsexceeded: (hsDetail.Alarm.Communicationattemptsexceeded == bulkInsert.Communicationattemptsexceeded) ? bulkInsert.Communicationattemptsexceeded : 0,
                            UnAuthenticatedConnectionRequest: (hsDetail.Alarm.UnAuthenticatedConnectionRequest == bulkInsert.UnAuthenticatedConnectionRequest) ? bulkInsert.UnAuthenticatedConnectionRequest : 0,
                            Meter_Demandresponseofimportactpwr_kWpostive: bulkInsert.Meter_Demandresponseofimportactpwr_kWpostive,
                            Meter_Demandresponseofexportactpwr_kWnegative: bulkInsert.Meter_Demandresponseofexportactpwr_kWnegative,
                            Meter_Demandresponseofexportreactpwr_kVarpositive: bulkInsert.Meter_Demandresponseofexportreactpwr_kVarpositive,
                            Meter_Demandresponseofexportreactpwr_kVarnegative: bulkInsert.Meter_Demandresponseofexportreactpwr_kVarnegative,
                            createdAt: bulkInsert.createdAt,
                            updatedAt: bulkInsert.updatedAt
                        }
                        if (bulkInsert.NoOfMeter == 0 || bulkInsert.NoOfMeter == "0" || !bulkInsert.NoOfMeter)
                            objLatestHSData[bulkInsert.CellID] = dataToInsert;
                        bulkInsertArr.push(dataToInsert)
                    }
                    else {
                        if (bulkInsert.NoOfMeter == 0 || bulkInsert.NoOfMeter == "0" || !bulkInsert.NoOfMeter)
                            objLatestHSData[bulkInsert.CellID] = bulkInsert;

                        bulkInsertArr.push(bulkInsert)
                    }
                }).filter(hsDetail => hsDetail !== undefined);
            }
            if (bulkInsertArr.length == bulkInsertArr1.length) {
                objdaoimpl.fetchData("Meter", meterCondition, function (err1, meterDetails) {

                    if (err1 || meterDetails.length == 0) {
                        bulkInsertArr.forEach(function (bulkInsert) {
                            //objLatestHSData[bulkInsert.CellID] = dataToInsert;
                            objLatestMeterData[bulkInsert.Meter_DeviceID] = bulkInsert;
                            finalbulkArr.push(bulkInsert)
                        })

                    } else {

                        bulkInsertArr.map(bulkInsert => {
                            meterDetail = meterDetails.find(meterDetail => meterDetail.MeterID == bulkInsert.MeterID);
                            if (meterDetail) {
                                dataToInsert1 = {
                                    Rev: (bulkInsert.Rev) ? bulkInsert.Rev : 0,
                                    Count: (bulkInsert.Count) ? bulkInsert.Count : 0,
                                    MessageID: (bulkInsert.MessageID) ? bulkInsert.MessageID : 0,
                                    CountryCode: (bulkInsert.CountryCode) ? bulkInsert.CountryCode : 0,
                                    RegionCode: (bulkInsert.RegionCode) ? bulkInsert.RegionCode : 0,
                                    CellID: (bulkInsert.CellID) ? bulkInsert.CellID : 0,
                                    MeterID: (bulkInsert.MeterID) ? bulkInsert.MeterID : 0,
                                    Type: (bulkInsert.Type) ? bulkInsert.Type : 0,
                                    Action: (bulkInsert.Action) ? bulkInsert.Action : 0,
                                    Attribute: (bulkInsert.Attribute) ? bulkInsert.Attribute : 0,
                                    DBTimestamp: (bulkInsert.DBTimestamp) ? bulkInsert.DBTimestamp : 0,
                                    Meter_DeviceID: (bulkInsert.Meter_DeviceID) ? bulkInsert.Meter_DeviceID : 0,
                                    Meter_Phase: (bulkInsert.Meter_Phase) ? bulkInsert.Meter_Phase : 0,
                                    Meter_Status: (bulkInsert.Meter_Status) ? bulkInsert.Meter_Status : 0,
                                    Meter_ReadTimestamp: (bulkInsert.Meter_ReadTimestamp) ? bulkInsert.Meter_ReadTimestamp : 0,
                                    Meter_VoltageSagLine1: (meterDetail.Alarm.Meter_VoltageSagLine1 == bulkInsert.Meter_VoltageSagLine1) ? meterDetail.Alarm.Meter_VoltageSagLine1 : 0,
                                    Meter_VoltageSagLine2: (meterDetail.Alarm.Meter_VoltageSagLine2 == bulkInsert.Meter_VoltageSagLine2) ? meterDetail.Alarm.Meter_VoltageSagLine2 : 0,
                                    Meter_VoltageSagLine3: (meterDetail.Alarm.Meter_VoltageSagLine3 == bulkInsert.Meter_VoltageSagLine3) ? meterDetail.Alarm.Meter_VoltageSagLine3 : 0,
                                    Meter_VoltageSwellLine1: (meterDetail.Alarm.Meter_VoltageSwellLine1 == bulkInsert.Meter_VoltageSwellLine1) ? meterDetail.Alarm.Meter_VoltageSwellLine1 : 0,
                                    Meter_VoltageSwellLine2: (meterDetail.Alarm.Meter_VoltageSwellLine2 == bulkInsert.Meter_VoltageSwellLine2) ? meterDetail.Alarm.Meter_VoltageSwellLine2 : 0,
                                    Meter_VoltageSwellLine3: (meterDetail.Alarm.Meter_VoltageSwellLine3 == bulkInsert.Meter_VoltageSwellLine3) ? meterDetail.Alarm.Meter_VoltageSwellLine3 : 0,
                                    Meter_VoltageUnbalance: (meterDetail.Alarm.Meter_VoltageUnbalance == bulkInsert.Meter_VoltageUnbalance) ? meterDetail.Alarm.Meter_VoltageUnbalance : 0,
                                    Meter_VoltageCablelossLine1: (meterDetail.Alarm.Meter_VoltageCablelossLine1 == bulkInsert.Meter_VoltageCablelossLine1) ? meterDetail.Alarm.Meter_VoltageCablelossLine1 : 0,
                                    Meter_VoltageCablelossLine2: (meterDetail.Alarm.Meter_VoltageCablelossLine2 == bulkInsert.Meter_VoltageCablelossLine2) ? meterDetail.Alarm.Meter_VoltageCablelossLine2 : 0,
                                    Meter_VoltageCablelossLine3: (meterDetail.Alarm.Meter_VoltageCablelossLine3 == bulkInsert.Meter_VoltageCablelossLine3) ? meterDetail.Alarm.Meter_VoltageCablelossLine3 : 0,
                                    Meter_VoltageTHDOverLimitLine1: (meterDetail.Alarm.Meter_VoltageTHDOverLimitLine1 == bulkInsert.Meter_VoltageTHDOverLimitLine1) ? meterDetail.Alarm.Meter_VoltageTHDOverLimitLine1 : 0,
                                    Meter_VoltageTHDOverLimitLine2: (meterDetail.Alarm.Meter_VoltageTHDOverLimitLine2 == bulkInsert.Meter_VoltageTHDOverLimitLine2) ? meterDetail.Alarm.Meter_VoltageTHDOverLimitLine2 : 0,
                                    Meter_VoltageTHDOverLimitLine3: (meterDetail.Alarm.Meter_VoltageTHDOverLimitLine3 == bulkInsert.Meter_VoltageTHDOverLimitLine3) ? meterDetail.Alarm.Meter_VoltageTHDOverLimitLine3 : 0,
                                    Meter_CurrentTHDOverLimitLine1: (meterDetail.Alarm.Meter_CurrentTHDOverLimitLine1 == bulkInsert.Meter_CurrentTHDOverLimitLine1) ? meterDetail.Alarm.Meter_CurrentTHDOverLimitLine1 : 0,
                                    Meter_CurrentTHDOverLimitLine2: (meterDetail.Alarm.Meter_CurrentTHDOverLimitLine2 == bulkInsert.Meter_CurrentTHDOverLimitLine2) ? meterDetail.Alarm.Meter_CurrentTHDOverLimitLine2 : 0,
                                    Meter_CurrentTHDOverLimitLine3: (meterDetail.Alarm.Meter_CurrentTHDOverLimitLine3 == bulkInsert.Meter_CurrentTHDOverLimitLine3) ? meterDetail.Alarm.Meter_CurrentTHDOverLimitLine3 : 0,
                                    Meter_PrimaryPowerUp: (meterDetail.Alarm.Meter_PrimaryPowerUp == bulkInsert.Meter_PrimaryPowerUp) ? meterDetail.Alarm.Meter_PrimaryPowerUp : 0,
                                    Meter_PrimaryPowerDown: (meterDetail.Alarm.Meter_PrimaryPowerDown == bulkInsert.Meter_PrimaryPowerDown) ? meterDetail.Alarm.Meter_PrimaryPowerDown : 0,
                                    Meter_LongOutagedetection: (meterDetail.Alarm.Meter_LongOutagedetection == bulkInsert.Meter_LongOutagedetection) ? meterDetail.Alarm.Meter_LongOutagedetection : 0,
                                    Meter_ShortOutagedetection: (meterDetail.Alarm.Meter_ShortOutagedetection == bulkInsert.Meter_ShortOutagedetection) ? meterDetail.Alarm.Meter_ShortOutagedetection : 0,
                                    Meter_NonvolatileMemoryFailed: (meterDetail.Alarm.Meter_NonvolatileMemoryFailed == bulkInsert.Meter_NonvolatileMemoryFailed) ? meterDetail.Alarm.Meter_NonvolatileMemoryFailed : 0,
                                    Meter_Clockerrordetected: (meterDetail.Alarm.Meter_Clockerrordetected == bulkInsert.Meter_Clockerrordetected) ? meterDetail.Alarm.Meter_Clockerrordetected : 0,
                                    Meter_LowBatteryVoltage: (meterDetail.Alarm.Meter_LowBatteryVoltage == bulkInsert.Meter_LowBatteryVoltage) ? meterDetail.Alarm.Meter_LowBatteryVoltage : 0,
                                    Meter_FlashMemoryFailed: (meterDetail.Alarm.Meter_FlashMemoryFailed == bulkInsert.Meter_FlashMemoryFailed) ? meterDetail.Alarm.Meter_FlashMemoryFailed : 0,
                                    Meter_Firmwareupgraded: (meterDetail.Alarm.Meter_Firmwareupgraded == bulkInsert.Meter_Firmwareupgraded) ? meterDetail.Alarm.Meter_Firmwareupgraded : 0,
                                    Meter_Demandreset: (meterDetail.Alarm.Meter_Demandreset == bulkInsert.Meter_Demandreset) ? meterDetail.Alarm.Meter_Demandreset : 0,
                                    Meter_TimeSynchronized: (meterDetail.Alarm.Meter_TimeSynchronized == bulkInsert.Meter_TimeSynchronized) ? meterDetail.Alarm.Meter_TimeSynchronized : 0,
                                    Meter_Historylogcleared: (meterDetail.Alarm.Meter_Historylogcleared == bulkInsert.Meter_Historylogcleared) ? meterDetail.Alarm.Meter_Historylogcleared : 0,
                                    Meter_Coverremoval: (meterDetail.Alarm.Meter_Coverremoval == bulkInsert.Meter_Coverremoval) ? meterDetail.Alarm.Meter_Coverremoval : 0,
                                    Meter_Terminalcoverremoval: (meterDetail.Alarm.Meter_Terminalcoverremoval == bulkInsert.Meter_Terminalcoverremoval) ? meterDetail.Alarm.Meter_Terminalcoverremoval : 0,
                                    Meter_MeterDisconnected: (meterDetail.Alarm.Meter_MeterDisconnected == bulkInsert.Meter_MeterDisconnected) ? meterDetail.Alarm.Meter_MeterDisconnected : 0,
                                    Meter_MeterConnected: (meterDetail.Alarm.Meter_MeterConnected == bulkInsert.Meter_MeterConnected) ? meterDetail.Alarm.Meter_MeterConnected : 0,
                                    'Meter_Demandresponseofimportactpwr(kW+)': (meterDetail.Alarm["Meter_Demandresponseofimportactpwr(kW+)"] == bulkInsert["Meter_Demandresponseofimportactpwr(kW+)"]) ? meterDetail.Alarm["Meter_Demandresponseofimportactpwr(kW+)"] : 0,
                                    'Meter_Demandresponseofexportactpwr(kW-)': (meterDetail.Alarm["Meter_Demandresponseofexportactpwr(kW-)"] == bulkInsert["Meter_Demandresponseofimportactpwr(kW-)"]) ? meterDetail.Alarm["Meter_Demandresponseofexportactpwr(kW-)"] : 0,
                                    'Meter_Demandresponseofimportreactpwr(kVar+)': (meterDetail.Alarm["Meter_Demandresponseofimportreactpwr(kVar+)"] == bulkInsert["Meter_Demandresponseofimportreactpwr(kVar+)"]) ? meterDetail.Alarm["Meter_Demandresponseofimportreactpwr(kVar+)"] : 0,
                                    'Meter_Demandresponseofexportreactpwr(kVar-)': (meterDetail.Alarm["Meter_Demandresponseofexportreactpwr(kVar-)"] == bulkInsert["Meter_Demandresponseofimportreactpwr(kVar-)"]) ? meterDetail.Alarm["Meter_Demandresponseofexportreactpwr(kVar-)"] : 0,
                                    NoOfMeter: (bulkInsert.NoOfMeter) ? bulkInsert.NoOfMeter : 0,
                                    StatusTransformer: (bulkInsert.StatusTransformer) ? bulkInsert.StatusTransformer : 0,
                                    ReadTimestamp: (bulkInsert.ReadTimestamp) ? bulkInsert.ReadTimestamp : 0,
                                    CircuitID: (bulkInsert.CircuitID) ? bulkInsert.CircuitID : 0,
                                    TransformerID: (bulkInsert.TransformerID) ? bulkInsert.TransformerID : 0,
                                    HypersproutID: (bulkInsert.HypersproutID) ? bulkInsert.HypersproutID : 0,
                                    MeterSerialNumber: meterDetail.MeterSerialNumber,
                                    Phase: (bulkInsert.Phase) ? bulkInsert.Phase : 0,
                                    OverVoltage: (bulkInsert.OverVoltage) ? bulkInsert.OverVoltage : 0,
                                    UnderVoltage: (bulkInsert.UnderVoltage) ? bulkInsert.UnderVoltage : 0,
                                    OverLoadLine1MDAlarm: (bulkInsert.OverLoadLine1MDAlarm) ? bulkInsert.OverLoadLine1MDAlarm : 0,
                                    OverLoadLine2MDAlarm: (bulkInsert.OverLoadLine2MDAlarm) ? bulkInsert.OverLoadLine2MDAlarm : 0,
                                    OverLoadLine3MDAlarm: (bulkInsert.OverLoadLine3MDAlarm) ? bulkInsert.OverLoadLine3MDAlarm : 0,
                                    OverFrequency: (bulkInsert.OverFrequency) ? bulkInsert.OverFrequency : 0,
                                    UnderFrequency: (bulkInsert.UnderFrequency) ? bulkInsert.UnderFrequency : 0,
                                    PowerFailure: (bulkInsert.PowerFailure) ? bulkInsert.PowerFailure : 0,
                                    CTOpen: (bulkInsert.CTOpen) ? bulkInsert.CTOpen : 0,
                                    PTOpen: (bulkInsert.PTOpen) ? bulkInsert.PTOpen : 0,
                                    OilLevelSensorFailure: (bulkInsert.OilLevelSensorFailure) ? bulkInsert.OilLevelSensorFailure : 0,
                                    TamperLid: (bulkInsert.TamperLid) ? bulkInsert.TamperLid : 0,
                                    TamperBox: (bulkInsert.TamperBox) ? bulkInsert.TamperBox : 0,
                                    LowOilLevel: (bulkInsert.LowOilLevel) ? bulkInsert.LowOilLevel : 0,
                                    HighOilTemperature: (bulkInsert.HighOilTemperature) ? bulkInsert.HighOilTemperature : 0,
                                    LowBatteryVoltage: (bulkInsert.LowBatteryVoltage) ? bulkInsert.LowBatteryVoltage : 0,
                                    BatteryFailure: (bulkInsert.BatteryFailure) ? bulkInsert.BatteryFailure : 0,
                                    BatteryRemoved: (bulkInsert.BatteryRemoved) ? bulkInsert.BatteryRemoved : 0,
                                    PrimaryPowerUp: (bulkInsert.PrimaryPowerUp) ? bulkInsert.PrimaryPowerUp : 0,
                                    PrimaryPowerDown: (bulkInsert.PrimaryPowerDown) ? bulkInsert.PrimaryPowerDown : 0,
                                    NonTechnicalLoss: (bulkInsert.NonTechnicalLoss) ? bulkInsert.NonTechnicalLoss : 0,
                                    MeterConnected: (bulkInsert.MeterConnected) ? bulkInsert.MeterConnected : 0,
                                    MeterDisconnected: (bulkInsert.MeterDisconnected) ? bulkInsert.MeterDisconnected : 0,
                                    WiFiCommunicationLoss: (bulkInsert.WiFiCommunicationLoss) ? bulkInsert.WiFiCommunicationLoss : 0,
                                    threeG4GLTECommunicationLoss: (bulkInsert.threeG4GLTECommunicationLoss) ? bulkInsert.threeG4GLTECommunicationLoss : 0,
                                    Communicationattemptsexceeded: (bulkInsert.Communicationattemptsexceeded) ? bulkInsert.Communicationattemptsexceeded : 0,
                                    UnAuthenticatedConnectionRequest: (bulkInsert.UnAuthenticatedConnectionRequest) ? bulkInsert.UnAuthenticatedConnectionRequest : 0,
                                    Meter_Demandresponseofimportactpwr_kWpostive: (bulkInsert.Meter_Demandresponseofimportactpwr_kWpostive) ? bulkInsert.Meter_Demandresponseofimportactpwr_kWpostive : 0,
                                    Meter_Demandresponseofexportactpwr_kWnegative: (bulkInsert.Meter_Demandresponseofexportactpwr_kWnegative) ? ulkInsert.Meter_Demandresponseofexportactpwr_kWnegative : 0,
                                    Meter_Demandresponseofexportreactpwr_kVarpositive: (bulkInsert.Meter_Demandresponseofexportreactpwr_kVarpositive) ? bulkInsert.Meter_Demandresponseofexportreactpwr_kVarpositive : 0,
                                    Meter_Demandresponseofexportreactpwr_kVarnegative: (bulkInsert.Meter_Demandresponseofexportreactpwr_kVarnegative) ? bulkInsert.Meter_Demandresponseofexportreactpwr_kVarnegative : 0,
                                    createdAt: bulkInsert.createdAt,
                                    updatedAt: bulkInsert.updatedAt
                                }
                                objLatestMeterData[bulkInsert.Meter_DeviceID] = dataToInsert1;
                                //  objLatestHSData[bulkInsert.CellID] = dataToInsert1;
                                finalbulkArr.push(dataToInsert1)
                            } else {

                                //  objLatestHSData[bulkInsert.CellID] = dataToInsert1;
                                objLatestMeterData[bulkInsert.Meter_DeviceID] = bulkInsert;
                                finalbulkArr.push(bulkInsert)

                            }
                        }).filter(meterDetail => meterDetail !== undefined);

                    }
                    if (finalbulkArr.length == bulkInsertArr1.length) {
                        callback(null, finalbulkArr)
                    }
                })

            }
        })
    } catch (e) {
        callback("Something went wrong!" + e.name + " " + e.message, null)
    }
}



module.exports = {
    updateAlarmsandEventsDataToRDBMS: updateAlarmsandEventsDataToRDBMS
};





