var assert = require('assert');
var expect = require('chai').expect;
var plugin = require('./volumeGroupsRestorable');

const createCache = (err, data, bdata, berr) => {
    return {
        regionSubscription: {
            "list": {
                "us-ashburn-1": {
                    "data": [
                        {
                            "regionKey": "IAD",
                            "regionName": "us-ashburn-1",
                            "status": "READY",
                            "isHomeRegion": true
                        },
                        {
                            "regionKey": "LHR",
                            "regionName": "uk-london-1",
                            "status": "READY",
                            "isHomeRegion": false
                        },
                        {
                            "regionKey": "PHX",
                            "regionName": "us-phoenix-1",
                            "status": "READY",
                            "isHomeRegion": false
                        }
                    ]
                }
            }
        },
        volumeGroup: {
            list: {
                'us-ashburn-1': {
                    err: err,
                    data: data
                }
            }
        },
        volumeGroupBackup: {
            list: {
                'us-ashburn-1': {
                    err: berr,
                    data: bdata
                }
            }
        }
    }
};

describe('volumeGroupsRestorable', function () {
    describe('run', function () {
        it('should give unknown result if a volume group error is passed or no data is present', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.be.above(1)
                expect(results[0].status).to.equal(3)
                expect(results[0].message).to.include('Unable to query for volume groups')
                expect(results[0].region).to.equal('us-ashburn-1')
                done()
            };

            const cache = createCache(
                [],
                undefined
            );

            plugin.run(cache, {}, callback);
        })

        it('should give passing result if no volume group records are found', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.be.above(1)
                expect(results[0].status).to.equal(0)
                expect(results[0].message).to.include('No volume groups found')
                expect(results[0].region).to.equal('us-ashburn-1')
                done()
            };

            const cache = createCache(
                null,
                []
            );

            plugin.run(cache, {}, callback);
        })

        it('should give unknown result if a volume group backup error is passed or no data is present', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.be.above(1)
                expect(results[0].status).to.equal(3)
                expect(results[0].message).to.include('Unable to query for volume group backups')
                expect(results[0].region).to.equal('us-ashburn-1')
                done()
            };

            const cache = createCache(
                null,
                ['lots of data'],
                undefined,
                ['error']
            );

            plugin.run(cache, {}, callback);
        })

        it('should give failing result if there is a volume group without a backup', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.be.above(1)
                expect(results[0].status).to.equal(2)
                expect(results[0].message).to.include('Volume group is not actively restorable')
                expect(results[0].region).to.equal('us-ashburn-1')
                done()
            };

            const cache = createCache(
                null,
                [
                    {
                        "availabilityDomain": "fMgC:US-ASHBURN-AD-1",
                        "compartmentId": "ocid1.tenancy.oc1..aaaaaaaao43aqdrzuacodg7ffqv2zeauftjyjkwhnbrugt44ympzeiblxx7q",
                        "definedTags": {},
                        "displayName": "giotest1",
                        "freeformTags": {},
                        "systemTags": {},
                        "id": "ocid1.volume.oc1.iad.bauwcljtquhbwu5divro64gimkrnfdaxo43cy44cbpuz42g652ol4gw6qsnf",
                        "isHydrated": true,
                        "kmsKeyId": null,
                        "lifecycleState": "AVAILABLE",
                        "performanceTier": null,
                        "vpusPerGB": null,
                        "sizeInGBs": 1024,
                        "sizeInMBs": 1048576,
                        "sourceDetails": null,
                        "timeCreated": "2019-08-29T21:46:01.836Z",
                        "volumeGroupId": null
                    }
                ],
                [
                    {
                        "compartmentId": "ocid1.tenancy.oc1..aaaaaaaao43aqdrzuacodg7ffqv2zeauftjyjkwhnbrugt44ympzeiblxx7q",
                        "definedTags": {},
                        "systemTags": {},
                        "displayName": "backuptest1",
                        "expirationTime": null,
                        "freeformTags": {},
                        "id": "ocid1.volumebackup.oc1.iad.abuwcljtiuribmakhn5ilf7ixc263yrnhgewg7df45wnv6pxlv7w3suuyglq",
                        "kmsKeyId": null,
                        "lifecycleState": "AVAILABLE",
                        "sizeInGBs": 1024,
                        "sizeInMBs": 1048576,
                        "sourceType": "MANUAL",
                        "sourceVolumeBackupId": null,
                        "timeCreated": "2019-08-30T00:00:24.255Z",
                        "timeRequestReceived": "2019-08-30T00:00:13.280Z",
                        "type": "FULL",
                        "uniqueSizeInGBs": 1,
                        "uniqueSizeInMbs": 1,
                        "volumeId": "ocid1.volume.oc1.iad.abuwcljtquhbwu5divro64gimkrnfdaxo43cy44cbpuz42g652ol4gw6qsma"
                    }
                ],
                null
            );

            plugin.run(cache, {}, callback);
        })

        it('should give passing result if all volume groups have backups', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.be.above(1)
                expect(results[0].status).to.equal(0)
                expect(results[0].message).to.include('Volume group is actively restorable')
                expect(results[0].region).to.equal('us-ashburn-1')
                done()
            };

            const cache = createCache(
                null,
                [
                    {
                        "availabilityDomain": "fMgC:US-ASHBURN-AD-1",
                        "compartmentId": "ocid1.tenancy.oc1..aaaaaaaao43aqdrzuacodg7ffqv2zeauftjyjkwhnbrugt44ympzeiblxx7q",
                        "definedTags": {},
                        "displayName": "giotest1",
                        "freeformTags": {},
                        "systemTags": {},
                        "id": "ocid1.volume.oc1.iad.abuwcljtquhbwu5divro64gimkrnfdaxo43cy44cbpuz42g652ol4gw6qsma",
                        "isHydrated": true,
                        "kmsKeyId": null,
                        "lifecycleState": "AVAILABLE",
                        "performanceTier": null,
                        "vpusPerGB": null,
                        "sizeInGBs": 1024,
                        "sizeInMBs": 1048576,
                        "sourceDetails": null,
                        "timeCreated": "2019-08-29T21:46:01.836Z",
                        "volumeGroupId": null
                    }
                ],
                [
                    {
                        "compartmentId": "ocid1.tenancy.oc1..aaaaaaaao43aqdrzuacodg7ffqv2zeauftjyjkwhnbrugt44ympzeiblxx7q",
                        "definedTags": {},
                        "systemTags": {},
                        "displayName": "backuptest1",
                        "expirationTime": null,
                        "freeformTags": {},
                        "id": "ocid1.volumebackup.oc1.iad.abuwcljtiuribmakhn5ilf7ixc263yrnhgewg7df45wnv6pxlv7w3suuyglq",
                        "kmsKeyId": null,
                        "lifecycleState": "AVAILABLE",
                        "sizeInGBs": 1024,
                        "sizeInMBs": 1048576,
                        "sourceType": "MANUAL",
                        "sourceVolumeBackupId": null,
                        "timeCreated": "2019-08-30T00:00:24.255Z",
                        "timeRequestReceived": "2019-08-30T00:00:13.280Z",
                        "type": "FULL",
                        "uniqueSizeInGBs": 1,
                        "uniqueSizeInMbs": 1,
                        "volumeGroupId": "ocid1.volume.oc1.iad.abuwcljtquhbwu5divro64gimkrnfdaxo43cy44cbpuz42g652ol4gw6qsma"
                    }
                ],
                null
            );

            plugin.run(cache, {}, callback);
        })
    })
})