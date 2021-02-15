var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'EBS Backup Enabled',
    category: 'EC2',
    description: 'Checks whether EBS Backup is enabled',
    more_info: 'EBS volumes should have backups in the form of snapshots.',
    recommended_action: 'Ensure that each EBS volumes contain at least .',
    link: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-modifying-snapshot-permissions.html',
    apis: ['EC2:describeInstances', 'EC2:describeVolumes', 'EC2:describeSnapshots', 'EC2:describeSnapshotAttribute', 'STS:getCallerIdentity'],

    run: function(cache, settings, callback) {
        let results = [];
        let source = {};
        let regions = helpers.regions(settings);

        let acctRegion = helpers.defaultRegion(settings);
        let awsOrGov = helpers.defaultPartition(settings);
        let accountId = helpers.addSource(cache, source, ['sts', 'getCallerIdentity', acctRegion, 'data']);

        async.each(regions.ec2, function(region, rcb) {
            let describeVolumes = helpers.addSource(cache, source,
                ['ec2', 'describeVolumes', region]);
            let describeSnapshots = helpers.addSource(cache, source,
                ['ec2', 'describeSnapshots', region]);

            if (!describeVolumes) return rcb();
            if (!describeSnapshots) return rcb();

            if (describeVolumes.err || !describeVolumes.data) {
                helpers.addResult(results, 3,
                    'Unable to query for EBS Volumes: ' + helpers.addError(describeVolumes), region);
                return rcb();
            }

            if (!describeVolumes.data.length) {
                helpers.addResult(results, 0, 'No EBS Volumes found', region);
                return rcb();
            }

            if (describeSnapshots.err || !describeSnapshots.data) {
                helpers.addResult(results, 3,
                    `Unable to query for EBS Snapshots: ${helpers.addError(describeSnapshots)}`, region);
                return rcb();
            }

            let snapshotVolumeMapping = {};
            describeVolumes.data.forEach(function(volume) {
                if (volume.VolumeId) {
                    snapshotVolumeMapping[volume.VolumeId] = [];
                }
            });

            describeSnapshots.data.forEach(function(snapshot){
                if(snapshot.VolumeId){
                    if(snapshot.VolumeId in snapshotVolumeMapping){
                        let snapshotsForVolume = snapshotVolumeMapping[snapshot.VolumeId];
                        snapshotsForVolume.push(snapshot.SnapshotId);
                    }
                }
            });

            Object.keys(snapshotVolumeMapping).forEach(function(volumeId){
                let volumeArn = 'arn:' + awsOrGov + ':ec2:' + region + ':' + accountId + ':volume/' + volumeId;
                if(!snapshotVolumeMapping[volumeId].length){
                    helpers.addResult(results, 2,
                        'EBS Volume is not backed up',
                        region, volumeArn);
                }else{
                    helpers.addResult(results, 0,
                        'EBS Volume is backed up',
                        region, volumeArn);
                }
            });
            rcb();

        }, function() {
            callback(null, results, source);
        });
    }
};