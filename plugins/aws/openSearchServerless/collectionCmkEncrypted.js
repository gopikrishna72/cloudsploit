var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'OpenSearch Collection CMK Encryption',
    category: 'OpenSearch',
    domain: 'Serverless',
    description: 'Ensures that OpenSearch Serverless collections are encrypted with KMS Customer Master Keys (CMKs).',
    more_info: 'OpenSearch Serverless collections should be not be publicly accessible to prevent unauthorized actions.',
    link: 'https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html',
    recommended_action: 'Update the network policy and remove the public access to collection.',
    apis: ['OpenSearchServerless:listEncryptionSecurityPolicies',  'OpenSearchServerless:listCollections', 'OpenSearchServerless:getEncryptionSecurityPolicy',],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);

        async.each(regions.opensearchserverless, function(region, rcb){
            var listCollections = helpers.addSource(cache, source, 
                ['opensearchserverless', 'listCollections', region]);
            
            if (!listCollections) return rcb();

            if ( !listCollections.data || listCollections.err) {
                helpers.addResult(results, 3,
                    'Unable to query list collections: ' + helpers.addError(listCollections), region);
                return rcb();
            }
            if (!listCollections.data.length){
                helpers.addResult(results, 0, 'No Collection found', region);
                return rcb();
            }
            var listSecurityPolicies = helpers.addSource(cache, source,
                ['opensearchserverless', 'listEncryptionSecurityPolicies', region]);

            if (!listSecurityPolicies && listSecurityPolicies.err || !listSecurityPolicies.data) {
                helpers.addResult(results, 3,
                    'Unable to query list security policy: ' + helpers.addError(listSecurityPolicies), region);
                return rcb();
            }

            if (!listSecurityPolicies.data.length) {
                helpers.addResult(results, 0, 'No Security Policy found', region);
                return rcb();
            }
            let policyMap = {};
            for (let policy of listSecurityPolicies.data){

                var getSecurityPolicy = helpers.addSource(cache, source,
                    ['opensearchserverless', 'getEncryptionSecurityPolicy', region, policy.name]);

                if (!getSecurityPolicy || !getSecurityPolicy.data || getSecurityPolicy.err){
                    helpers.addResult(results, 3,
                        'Unable to query get security policy: ' + helpers.addError(getSecurityPolicy), region);
                    return rcb();
                }
                let securityPolicy;
                if (getSecurityPolicy.data.securityPolicyDetail.policy){
                    securityPolicy = getSecurityPolicy.data.securityPolicyDetail.policy;
                }

                if (getSecurityPolicy.data.securityPolicyDetail.policy){
                    for (let collection of listCollections.data){
                        if (securityPolicy.AWSOwnedKey){
                            
                            let found = securityPolicy.Rules.find(rule => rule.Resource.indexOf(`collection/${collection.name}`) > -1 &&
                                rule.ResourceType == 'collection');

                            if (found && !policyMap[collection.arn]){
                                policyMap[collection.arn] = policy.name;
                                break;
                            }
                        }
                        
                    }
                }
            }
            for (let col of listCollections.data){
                if (policyMap[col.arn]){
                    helpers.addResult(results, 2, 'OpenSearch Serverless collection is using default key for encryption', region, col.arn);
                } else {
                    helpers.addResult(results, 0, 'OpenSearch Serverless collection is using CMK for encryption', region, col.arn);
                }
            }
            rcb();
        }, function(){
            callback(null, results, source);
        });
    }
};