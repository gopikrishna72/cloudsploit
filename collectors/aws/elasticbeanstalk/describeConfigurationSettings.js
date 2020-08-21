var AWS = require('aws-sdk');
var async = require('async');

module.exports = function(AWSConfig, collection, callback) {
    var elasticbeanstalk = new AWS.ElasticBeanstalk(AWSConfig);

    async.eachLimit(collection.elasticbeanstalk.describeEnvironments[AWSConfig.region].data, 15, function(environment, cb) {
        var params = {
            ApplicationName: environment.ApplicationName,
            EnvironmentName: environment.EnvironmentName
        };
        elasticbeanstalk.describeConfigurationSettings(params, function(err, data) {
            collection.elasticbeanstalk.describeConfigurationSettings[AWSConfig.region][environment.EnvironmentName] = {};
            if (err || !data) {
                collection.elasticbeanstalk.describeConfigurationSettings[AWSConfig.region][environment.EnvironmentName].err = err;
            } else {
                collection.elasticbeanstalk.describeConfigurationSettings[AWSConfig.region][environment.EnvironmentName].data = data;
            }
            cb();
        });
    }, function() {
        callback();
    });
};
