var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'AutoScaling Group Missing ELB',
    category: 'AutoScaling',
    description: 'Ensures all autoscaling groups are referencing active load balancers.',
    more_info: 'Each autoscaling group should with a load balancer configured should reference an active ELB.',
    link: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/attach-load-balancer-asg.html',
    recommended_action: 'Ensure that the autoscaling group load balancer has not been deleted. If so, remove it from the ASG.',
    apis: ['AutoScaling:describeAutoScalingGroups', 'ELB:describeLoadBalancers', 'ELBv2:describeLoadBalancers'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);
        var loadBalancers = {};

        async.each(regions.autoscaling, function(region, rcb){
            var autoScalingGroups = helpers.addSource(cache, source,
                ['autoscaling', 'describeAutoScalingGroups', region]);
                
            var elasticLoadBalancers = helpers.addSource(cache, source,
                ['elb', 'describeLoadBalancers', region]);

            var elasticLoadBalancersV2 = helpers.addSource(cache, source,
                ['elbv2', 'describeLoadBalancers', region]);

            if (!autoScalingGroups || !elasticLoadBalancers || !elasticLoadBalancersV2) return rcb();

            if (autoScalingGroups.err || !autoScalingGroups.data) {
                helpers.addResult(results, 3, 'Unable to query for AutoScaling groups: ' +  helpers.addError(autoScalingGroups), region);
                return rcb();
            }

            if (elasticLoadBalancers.err || !elasticLoadBalancers.data) {
                helpers.addResult(results, 3, 'Unable to query for Classic load balancers: ' +  helpers.addError(elasticLoadBalancers), region);
                return rcb();
            }

            if (elasticLoadBalancersV2.err || !elasticLoadBalancersV2.data) {
                helpers.addResult(results, 3, 'Unable to query for Application/Network load balancers: ' +  helpers.addError(elasticLoadBalancersV2), region);
                return rcb();
            }

            if (!autoScalingGroups.data.length) {
                helpers.addResult(results, 0, 'No AutoScaling group found', region);
                return rcb();
            }
            
            if (elasticLoadBalancers.data.length) {
                elasticLoadBalancers.data.forEach(function(elb) {
                    if(elb.LoadBalancerName) {
                        loadBalancers[elb.LoadBalancerName] =  elb;
                    }
                });
            }

            if (elasticLoadBalancersV2.data.length) {
                elasticLoadBalancersV2.data.forEach(function(elbv2) {
                    if(elbv2.LoadBalancerName) {
                        loadBalancers[elbv2.LoadBalancerName] =  elbv2;
                    }
                });
            }

            autoScalingGroups.data.forEach(function(asg) {
                var asgAvailabilityZones = asg.AvailabilityZones;
                var differentAzFound = false;
                var resource = asg.AutoScalingGroupARN;

                if(asg.HealthCheckType == 'ELB') {
                    if(!loadBalancers.length) {
                        helpers.addResult(results, 0, 'No Load Balancer found', region);
                        return rcb();
                    }

                    if (asg.LoadBalancerNames && asg.LoadBalancerNames.length) {

                        asg.LoadBalancerNames.forEach(function(elbName) {
                            if(elbName in loadBalancers) {
                                var loadBalancer = loadBalancers[elbName];
                                differentAzFound = false;
                                var elbAvailabilityZones = loadBalancer.AvailabilityZones;

                                // if Load Balancer is in any AZ different from AutoScaling group's AZs then add an error result
                                elbAvailabilityZones.forEach(function(elbAz) {
                                    if(!asgAvailabilityZones.includes(elbAz)) {
                                        differentAzFound = true;
                                    }
                                });

                                if(differentAzFound) {
                                    helpers.addResult(results, 2, 'Load balancer "' + elbName + '" is not in the same AZ as of AutoScaling group', region, resource);
                                }
                                else {
                                    helpers.addResult(results, 0, 'Load balancer "' + elbName + '" is in the same AZ as of AutoScaling group', region, resource);
                                }
                            }
                            else {
                                helpers.addResult(results, 2, 'AutoScaling group utilizes an inactive load balancer "'+ elbName + '"', region, resource);
                            }
                        });
                    }
                    else {
                        helpers.addResult(results, 2, 'AutoScaling group does not have any Load Balancer associated', region, resource);
                    }
                }
                else {
                    helpers.addResult(results, 0, 'AutoScaling group does not utilize a load balancer', region, resource);
                }
            });
            
            rcb();
        }, function(){
            callback(null, results, source);
        });
    }
};
