var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'ElasticSearch Cluster Status',
    category: 'ES',
    description: 'Ensure that ElasticSearch clusters are healthy, i.e status is green.',
    more_info: 'Unhealthy Amazon ES clusters with the status set to "Red" is crucial for availability of ElasticSearch applications.',
    link: 'https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/cloudwatch-alarms.html',
    recommended_action: 'Configure alarms to send notification if cluster status remains red for more than a minute.',
    apis: ['ES:listDomainNames', 'CloudWatch:getEsMetricStatistics'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);
        async.each(regions.es, function(region, rcb) {
            var listDomainNames = helpers.addSource(cache, source,
                ['es', 'listDomainNames', region]);

            if (!listDomainNames) return rcb();

            if (listDomainNames.err || !listDomainNames.data) {
                helpers.addResult(
                    results, 3,
                    `Unable to query for ES domains: ${helpers.addError(listDomainNames)}`, region);
                return rcb();
            }

            if (!listDomainNames.data.length){
                helpers.addResult(results, 0, 'No ES domains found', region);
                return rcb();
            }

            var found = false;

            async.each(listDomainNames.data, function(domain, dcb){
                var getMetricStats = helpers.addSource(cache, source,
                    ['cloudwatch', 'getEsMetricStatistics', region, domain.DomainName]);
               
                if (!getMetricStats ||
                    getMetricStats.err ||
                    !getMetricStats.data) {
                    helpers.addResult(results, 3,
                        `Unable to query for ES domain config: ${helpers.addError(getMetricStats)}`, region);
                    return dcb();
                }

                if (!getMetricStats.data.Datapoints.length) return dcb();
                var maximumValue = 0;
                getMetricStats.data.Datapoints.forEach((dataPoint) => {
                    if (maximumValue < dataPoint.Maximum) maximumValue = dataPoint.Maximum;
                });

                if (maximumValue > 1){
                    helpers.addResult(results, 2,
                        `ES Cluster for ES Domain: ${domain.DomainName} is unhealthy`, region);
                }
                
                dcb();
            }, function(){
                rcb();
            });

            if (!found){
                helpers.addResult(results, 0, 'All ES Clusters are healthy', region);
            }
        }, function() {
            callback(null, results, source);
        });
    }   
};