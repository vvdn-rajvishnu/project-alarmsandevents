var objMigrateAllAlarmsandEventsData = require('./controllers/migratealarmsandeventstordbms.js');
var dbCon = require('./dao/mongodaoimpl');

module.exports = function (context, myTimer) {
    context.log('Alarms and Events initiated');
    objMigrateAllAlarmsandEventsData.migrateAlarmsandEventsToRdbms(context,
        function (err, obj) {
            context.log('Error migrateAlarmsandEventsToRdbms', err);
            //dbCon.closeConnection();
            context.done();
        });
};