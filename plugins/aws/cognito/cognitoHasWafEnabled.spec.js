var expect = require('chai').expect;
var cognitoHasWafEnabled = require('./cognitoHasWafEnabled');

const listUserPools = [
    {
    Id: 'us-east-1_cbDh8sCFGH',
    Name: 'test',
    LambdaConfig: {}
    }
];

const createCache = (poolList, waf) => {
    return {
        cognitoidentityserviceprovider: {
            listUserPools: {
                'us-east-1': {
                    err: null,
                    data: poolList
                }
            },
        },
        sts: {
            getCallerIdentity: {
                'us-east-1': {
                data: '101363884315'
                }
            }
        },
        wafv2: {
            getWebACLForResource: {
            'us-east-1':{
                'us-east-1_cbDh8sCFGH': {
                    err: null,
                    data: waf
                }
                }
            }
        }

    }
};

describe('cognitoHasWafEnabled', function () {
    describe('run', function () {
        it('should give unknown result if unable to list user pools', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(3);
                done()
            };

            const cache = createCache(null, null);
            cognitoHasWafEnabled.run(cache, {}, callback);
        });

        it('should give passing result if User pool not found.', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(0);
                done();
            };
            const cache = createCache([], null);
            cognitoHasWafEnabled.run(cache, {}, callback);
        });

        it('should give unknown result if unable to query WAFV2 getWebACLForResource api', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(3);
                done();
            };

            const cache = createCache([listUserPools[0]], null);
            cognitoHasWafEnabled.run(cache, {}, callback);
        });

        it('should give passing result if User pool has WAF enabled', function (done) {
            const callback = (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(0);
                done();
            };

            const cache = createCache([listUserPools[0]], { WebACL: {'Name': 'abc'}});
            cognitoHasWafEnabled.run(cache, {}, callback);
        });

        it('should give failing result if User pool does not have WAF enabled', function (done) {
                const callback = (err, results) => {
                    expect(results.length).to.equal(1);
                    expect(results[0].status).to.equal(2);
                    done();
                };

            const cache = createCache([listUserPools[0]], { WebACL: null});
            cognitoHasWafEnabled.run(cache, {}, callback);
        });

    });
});