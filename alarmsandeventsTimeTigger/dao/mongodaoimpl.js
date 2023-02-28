var dbCon = require('../dao/mongoconnector.js');
var objConfig = require('../config.js');
var logger = console;

/**
 * @description - Code to get Data from Collection 
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @return - callback
 */
function getDataFromCollection(collectionName, arrWhereKey, arrWhereValue, callback) {
    getDataFromCollectionSorted(collectionName, arrWhereKey, arrWhereValue, null, null, callback);
}

/**
 * @description - Code to get Cursor from Collection 
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @return - callback
 */
function getCursorFromCollection(collectionName, arrWhereKey, arrWhereValue, callback) {
    getCursorFromCollectionSorted(collectionName, arrWhereKey, arrWhereValue, null, null, callback);
}
/**
 * @description - Code to get Sorted Data from Collection 
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @param objSortRecord - record to be sorted
 * @param objSkipCols - columns to be skipped
 * @return - callback
 */
function getDataFromCollectionSorted(collectionName, arrWhereKey, arrWhereValue, objSortRecord, objSkipCols, callback) {
    arrWhereKey = !arrWhereKey ? [] : arrWhereKey;
    arrWhereValue = !arrWhereValue ? [] : arrWhereValue;
    dbCon.getDb(function (err, db) {
        if (err) {
            callback(err, null);
        } else {
            var objCollection = db[collectionName];
            collectionfind(objCollection, arrWhereKey, arrWhereValue, objSortRecord, objSkipCols, callback);
        }
    });
}
/**
 * @description - Code to get Cursor Data from Collection 
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @param objSortRecord - record to be sorted
 * @param objSkipCols - columns to be skipped
 * @return - callback
 */
function getCursorFromCollectionSorted(collectionName, arrWhereKey, arrWhereValue, objSortRecord, objSkipCols, callback) {
    arrWhereKey = !arrWhereKey ? [] : arrWhereKey;
    arrWhereValue = !arrWhereValue ? [] : arrWhereValue;
    dbCon.getDb(function (err, db) {
        if (err) {
            callback(err, null);
        } else {
            var objCollection = db[collectionName];
            collectionfindCursor(objCollection, arrWhereKey, arrWhereValue, objSortRecord, objSkipCols, callback);
        }
    });
}
/**
 * @description - Code to find data from collection
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @param objSortRecord - record to be sorted
 * @param objSkipCols - columns to be skipped
 * @return - callback
 */
function collectionfind(objCollection, arrWhereKey, arrWhereValue, objSortRecord, objSkipCols, callback) {
    try {
        objSkipCols = objSkipCols ? objSkipCols : {};
        var objWhereCond = getWhereCondObj(arrWhereKey, arrWhereValue);
        if (objSortRecord) {
            objCollection.find(objWhereCond, objSkipCols).sort(objSortRecord).toArray(function (err, docs) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, docs);
                }
            });
        } else {
            objCollection.find(objWhereCond, objSkipCols).toArray(function (err, docs) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, docs);
                }
            });
        }
    } catch (err) {
        callback(err, null);
    }
}
/**
 * @description - Code to find Cursor from collection
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @param objSortRecord - record to be sorted
 * @param objSkipCols - columns to be skipped
 * @return - callback
 */

function collectionfindCursor(objCollection, arrWhereKey, arrWhereValue, objSortRecord, objSkipCols, callback) {
    try {
        objSkipCols = objSkipCols ? objSkipCols : {};
        var objWhereCond = getWhereCondObj(arrWhereKey, arrWhereValue);
        var objCursor;
        if (objSortRecord) {
            objCursor = objCollection.find(objWhereCond, objSkipCols).sort(objSortRecord);
            callback(null, objCursor);
        } else {
            objCursor = objCollection.find(objWhereCond, objSkipCols);
            callback(null, objCursor);
        }
    } catch (err) {
        callback(err, null);
    }
}
/**
 * @description - Code to generate where condition
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @return - callback
 */

function getWhereCondObj(arrWhereKey, arrWhereValue) {
    var objOutput = {};
    try {
        if (arrWhereKey.length !== arrWhereValue.length) {
            objOutput[arrWhereKey[0]] = { $in: arrWhereValue };
            return objOutput;
        }
        for (var i = 0; i < arrWhereKey.length; i++) {
            if (Array.isArray(arrWhereValue[i])) {
                var objValObj = { $in: arrWhereValue[i] };
                objOutput[arrWhereKey[i]] = objValObj;
            } else {
                objOutput[arrWhereKey[i]] = arrWhereValue[i];
            }
        }
    } catch (err) {
        logger.log(err);
    }
    return objOutput;
}
/**
 * @description - Code to insert document
 * @param collectionName - collection name
 * @param objToInsert - data to be inserted
 * @return - callback
 */
function insertDoc(collectionName, objToInsert, callback) {
    if (objConfig.environment !== "testcases") {
        callback(new Error('Not authorzied'), null);
        return;
    }
    dbCon.getDb(function (err, db) {
        if (err) {
            callback(err, null);
        } else {
            var objCollection = db[collectionName];
            objCollection.insert(objToInsert, function (err, r) {
                callback(err, r);
            });
        }
    });
}

/**
 * @description - Code to delete all document
 * @param collectionName - collection name
 * @return - callback
 */
function deleteAllDocs(collectionName, callback) {
    if (objConfig.environment !== "testcases") {
        callback(new Error('Not authorzied'), null);
        return;
    }
    dbCon.getDb(function (err, db) {
        if (err) {
            callback(err, null);
        } else {
            var objCollection = db[collectionName];
            objCollection.remove({}, function (err, r) {
                callback(err, r);
            });
        }
    });
}

/**
 * @description - Code to find count from collection
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @return - callback
 */
function fetchCount(collectionName, arrWhereKey, arrWhereValue,callback) {
    try {
        dbCon.getDb(function (err, db) {
            if (err) {
                callback(err, null);
            } else {
                var objCollection = db[collectionName];
                var objWhereCond = getWhereCondObj(arrWhereKey, arrWhereValue);
                objCollection.count(objWhereCond, function (err, docs) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, docs);
                    }
                });
            }
        });
    } catch (err) {
        callback(err, null);
    }
}
/**
 * @description - Code to find from collection with limit
 * @param collectionName - Name of Collection
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @return - callback
 */
function fetchWithLimit(collectionName,arrWhereKey, arrWhereValue, startIndex, limit, callback) {
    dbCon.getDb(function (err, db) {
        if (err) {
            callback(err, null);
        } else {
            var objCollection = db[collectionName];
            var objWhereCond = getWhereCondObj(arrWhereKey, arrWhereValue);
            let cursor = objCollection.find(objWhereCond);
            cursor.skip(startIndex)
                .limit(limit).toArray(function (err, Details) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null,Details);
                    }
                });
        }
    });
}

/**
 * @description - Code to close connection
 * @param Nil
 * @return - callback
 */
function closeConnection() {
    dbCon.closeDB();
}


/**
 * @description - Code to find from collection with some condition
 * @param DeviceType - Name of Device i.e Meter/HyperSprout/HyperHub/DeltaLink
 * @param arrWhereKey - condition key
 * @param arrWhereValue - condition Value
 * @return - callback
 */
function fetchData(DeviceType, condition, callback) {
    dbCon.getDb(function (err, db) {
        if (err) {
            callback(err, null);
        } else {

            let collection;
            let project;
            let alarmArr = [];
            if (DeviceType == "HyperSprout" || DeviceType == "HyperHub") {
                //  collection = db.DELTA_Config;
                collection = db["DELTA_Config"];
                project = { "_id": 0, "HypersproutID": 1, "HypersproutSerialNumber": 1, "Alarm": 1 }

            } else if (DeviceType == "Meter") {
                //  collection = db.DELTA_Config;
                collection = db["DELTA_Config"];
                project = { "_id": 0, "TransformerID": 1, "MeterSerialNumber": 1, "MeterID": 1, "Alarm": 1 }
            }
            let cursor = collection.find(condition).project(project);
            cursor.toArray(function (err, Details) {
                if (err) {
                    callback(err, null);
                } else {
                    if (Details.length > 0) {
                        if (DeviceType == "Meter") {
                            for (let i in Details) {
                                if (Details.hasOwnProperty(i)) {
                                    let meterData = {
                                        "MeterID": Details[i].MeterID,
                                        "MeterSerialNumber": Details[i].MeterSerialNumber,
                                        "TransformerID": Details[i].TransformerID,
                                        "Alarm": {
                                            "Meter_VoltageSagLine1": (Details[i].Alarm.VoltageSagLine1 == true) ? 1 : 0,
                                            "Meter_VoltageSagLine2": (Details[i].Alarm.VoltageSagLine2 == true) ? 1 : 0,
                                            "Meter_VoltageSagLine3": (Details[i].Alarm.VoltageSagLine3 == true) ? 1 : 0,
                                            "Meter_VoltageSwellLine1": (Details[i].Alarm.VoltageSwellLine1 == true) ? 1 : 0,
                                            "Meter_VoltageSwellLine2": (Details[i].Alarm.VoltageSwellLine2 == true) ? 1 : 0,
                                            "Meter_VoltageSwellLine3": (Details[i].Alarm.VoltageSwellLine3 == true) ? 1 : 0,
                                            "Meter_VoltageUnbalance": (Details[i].Alarm.VoltageUnbalance == true) ? 1 : 0,
                                            "Meter_VoltageCablelossLine1": (Details[i].Alarm.VoltageCablelossLine1 == true) ? 1 : 0,
                                            "Meter_VoltageCablelossLine2": (Details[i].Alarm.VoltageCablelossLine2 == true) ? 1 : 0,
                                            "Meter_VoltageCablelossLine3": (Details[i].Alarm.VoltageCablelossLine3 == true) ? 1 : 0,
                                            "Meter_VoltageTHDOverLimitLine1": (Details[i].Alarm.VoltageTHDOverLimitLine1 == true) ? 1 : 0,
                                            "Meter_VoltageTHDOverLimitLine2": (Details[i].Alarm.VoltageTHDOverLimitLine2 == true) ? 1 : 0,
                                            "Meter_VoltageTHDOverLimitLine3": (Details[i].Alarm.VoltageTHDOverLimitLine3 == true) ? 1 : 0,
                                            "Meter_CurrentTHDOverLimitLine1": (Details[i].Alarm.CurrentTHDOverLimitLine1 == true) ? 1 : 0,
                                            "Meter_CurrentTHDOverLimitLine2": (Details[i].Alarm.CurrentTHDOverLimitLine2 == true) ? 1 : 0,
                                            "Meter_CurrentTHDOverLimitLine3": (Details[i].Alarm.CurrentTHDOverLimitLine3 == true) ? 1 : 0,
                                            "Meter_PrimaryPowerUp": (Details[i].Alarm.PrimaryPowerUp == true) ? 1 : 0,
                                            "Meter_PrimaryPowerDown": (Details[i].Alarm.PrimaryPowerDown == true) ? 1 : 0,
                                            "Meter_LongOutagedetection": (Details[i].Alarm.LongOutagedetection == true) ? 1 : 0,
                                            "Meter_ShortOutagedetection": (Details[i].Alarm.ShortOutagedetection == true) ? 1 : 0,
                                            "Meter_NonvolatileMemoryFailed": (Details[i].Alarm.NonvolatileMemoryFailed == true) ? 1 : 0,
                                            "Meter_Clockerrordetected": (Details[i].Alarm.Clockerrordetected == true) ? 1 : 0,
                                            "Meter_LowBatteryVoltage": (Details[i].Alarm.LowBatteryVoltage == true) ? 1 : 0,
                                            "Meter_FlashMemoryFailed": (Details[i].Alarm.FlashMemoryFailed == true) ? 1 : 0,
                                            "Meter_Firmwareupgraded": (Details[i].Alarm.Firmwareupgraded == true) ? 1 : 0,
                                            "Meter_Demandreset": (Details[i].Alarm.Demandreset == true) ? 1 : 0,
                                            "Meter_TimeSynchronized": (Details[i].Alarm.TimeSynchronized == true) ? 1 : 0,
                                            "Meter_Historylogcleared": (Details[i].Alarm.Historylogcleared == true) ? 1 : 0,
                                            "Meter_Coverremoval": (Details[i].Alarm.Coverremoval == true) ? 1 : 0,
                                            "Meter_Terminalcoverremoval": (Details[i].Alarm.Terminalcoverremoval == true) ? 1 : 0,
                                            "Meter_MeterDisconnected": (Details[i].Alarm.MeterDisconnected == true) ? 1 : 0,
                                            "Meter_MeterConnected": (Details[i].Alarm.MeterConnected == true) ? 1 : 0,
                                            "Meter_Demandresponseofimportactpwr(kW+)": (Details[i].Alarm.DemandresponseofimportactpwrkWplus == true) ? 1 : 0,
                                            "Meter_Demandresponseofexportactpwr(kW-)": (Details[i].Alarm.DemandresponseofexportactpwrkWminus == true) ? 1 : 0,
                                            "Meter_Demandresponseofimportreactpwr(kVar+)": (Details[i].Alarm.DemandresponseofimportreactpwrkVarplus == true) ? 1 : 0,
                                            "Meter_Demandresponseofexportreactpwr(kVar-)": (Details[i].Alarm.DemandresponseofexportreactpwrkVarminus == true) ? 1 : 0
                                        }
                                    }
                                    alarmArr.push(meterData)
                                }
                                if (alarmArr.length == Details.length) {
                                    callback(null, alarmArr)
                                }
                            }
                        } else if (DeviceType == "HyperSprout") {

                            for (let i in Details) {
                                if (Details.hasOwnProperty(i)) {
                                    let hsData = {
                                        "HypersproutID": Details[i].HypersproutID,
                                        "HypersproutSerialNumber": Details[i].HypersproutSerialNumber,
                                        "Alarm": {
                                            "OverVoltage": (Details[i].Alarm.OverVoltage == true) ? 1 : 0,
                                            "UnderVoltage": (Details[i].Alarm.UnderVoltage == true) ? 1 : 0,
                                            "OverLoadLine1MDAlarm": (Details[i].Alarm["OverLoadLine1_MD_Alarm"] == true) ? 1 : 0,
                                            "OverLoadLine2MDAlarm": (Details[i].Alarm["OverLoadLine2_MD_Alarm"] == true) ? 1 : 0,
                                            "OverLoadLine3MDAlarm": (Details[i].Alarm["OverLoadLine3_MD_Alarm"] == true) ? 1 : 0,
                                            "OverFrequency": (Details[i].Alarm.OverFrequency == true) ? 1 : 0,
                                            "UnderFrequency": (Details[i].Alarm.UnderFrequency == true) ? 1 : 0,
                                            "PowerFailure": (Details[i].Alarm.PowerFailure == true) ? 1 : 0,
                                            "CTOpen": (Details[i].Alarm.CTOpen == true) ? 1 : 0,
                                            "PTOpen": (Details[i].Alarm.PTOpen == true) ? 1 : 0,
                                            "OilLevelSensorFailure": (Details[i].Alarm.OilLevelSensorFailure == true) ? 1 : 0,
                                            "TamperLid": (Details[i].Alarm.TamperLid == true) ? 1 : 0,
                                            "TamperBox": (Details[i].Alarm.TamperBox == true) ? 1 : 0,
                                            "LowOilLevel": (Details[i].Alarm.LowOilLevel == true) ? 1 : 0,
                                            "HighOilTemperature": (Details[i].Alarm.HighOilTemperature == true) ? 1 : 0,
                                            "LowBatteryVoltage": (Details[i].Alarm.LowBatteryVoltage == true) ? 1 : 0,
                                            "BatteryFailure": (Details[i].Alarm.BatteryFailure == true) ? 1 : 0,
                                            "BatteryRemoved": (Details[i].Alarm.BatteryRemoved == true) ? 1 : 0,
                                            "PrimaryPowerUp": (Details[i].Alarm.PrimaryPowerUp == true) ? 1 : 0,
                                            "PrimaryPowerDown": (Details[i].Alarm.PrimaryPowerDown == true) ? 1 : 0,
                                            "NonTechnicalLoss": (Details[i].Alarm["NonTechnicalLoss"] == true) ? 1 : 0,
                                            "MeterConnected": (Details[i].Alarm.MeterConnected == true) ? 1 : 0,
                                            "MeterDisconnected": (Details[i].Alarm.MeterDisconnected == true) ? 1 : 0,
                                            "WiFiCommunicationLoss": (Details[i].Alarm["WiFiCommunicationLoss"] == true) ? 1 : 0,
                                            "threeG4GLTECommunicationLoss": (Details[i].Alarm["LTECommunicationLoss_3G_4G"] == true) ? 1 : 0,
                                            "Communicationattemptsexceeded": (Details[i].Alarm.Communicationattemptsexceeded == true) ? 1 : 0,
                                            "UnAuthenticatedConnectionRequest": (Details[i].Alarm.UnAuthenticatedConnectionRequest == true) ? 1 : 0

                                        }
                                    }
                                    alarmArr.push(hsData)
                                }
                                if (alarmArr.length == Details.length) {
                                    callback(null, alarmArr)
                                }
                            }

                        }
                    }else{
                       callback(null, Details) 
                    }

                }
            });
        }
    });
}

module.exports = {
    getDataFromCollection: getDataFromCollection,
    getCursorFromCollection: getCursorFromCollection,
    getDataFromCollectionSorted: getDataFromCollectionSorted,
    getCursorFromCollectionSorted: getCursorFromCollectionSorted,
    closeConnection: closeConnection,
    insertDoc: insertDoc,
    deleteAllDocs: deleteAllDocs,
    fetchCount: fetchCount,
    fetchWithLimit: fetchWithLimit,
    fetchData:fetchData
};