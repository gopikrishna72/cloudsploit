var expect = require('chai').expect;
const openCIFS = require('./openCIFS');

const firewalls = [
    {
        "id": "4111718641158512144",
        "creationTimestamp": "2021-02-25T00:34:07.519-08:00",
        "name": "openall",
        "description": "Open All Ports",
        "network": "https://www.googleapis.com/compute/v1/projects/aqua-dev-akhtar/global/networks/app-vpc",
        "priority": 1000,
        "sourceRanges": [ "0.0.0.0/0" ],
        "allowed": [{ "IPProtocol": "udp", "ports": [ "445" ]}],
        "direction": "INGRESS",
        "disabled": false,
        "selfLink": "https://www.googleapis.com/compute/v1/projects/aqua-dev-akhtar/global/firewalls/openall",
        "kind": "compute#firewall"
    },
    {
        "id": "3482752052453535354",
        "creationTimestamp": "2021-02-25T00:34:07.519-08:00",
        "name": "opensome",
        "description": "",
        "network": "https://www.googleapis.com/compute/v1/projects/aqua-dev-akhtar/global/networks/app-vpc",
        "priority": 1000,
        "sourceRanges": [ "192.168.0.0/16" ],
        "allowed": [{ "IPProtocol": "tcp", "ports": [ "22" ]}],
        "direction": "INGRESS",
        "disabled": false,
        "selfLink": "https://www.googleapis.com/compute/v1/projects/aqua-dev-akhtar/global/firewalls/opensome",
        "kind": "compute#firewall"
    }
];

const createCache = (groups, err) => {
    return {
        firewalls:{
            list: {
                'global': {
                    data: groups,
                    err: err
                },
            },
        },
        projects: {
            get: {
                'global': {
                    data: 'testProj'
                }
            }
        }
    };
};

const createNullCache = () => {
    return {
        firewalls:{
            list: {
                'global': null,
            },
        },
    };
};

describe('openCIFS', function () {
    describe('run', function () {
        it('should PASS if no open ports found', function (done) {
            const cache = createCache([firewalls[1]]);
            openCIFS.run(cache, {}, (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(0);
                expect(results[0].region).to.equal('global');
                done();
            });
        });

        it('should FAIL if firewall rule UDP port 445 is open to public', function (done) {
            const cache = createCache([firewalls[0]]);
            openCIFS.run(cache, {}, (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(2);
                expect(results[0].region).to.equal('global');
                done();
            });
        });

        it('should PASS if no firewall rules found', function (done) {
            const cache = createCache([]);
            openCIFS.run(cache, {}, (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(0);
                expect(results[0].region).to.equal('global');
                done();
            });
        });

        it('should UNKNWON if unable to describe firewall rules', function (done) {
            const cache = createCache([], { message: 'Unable to query firewall rules'});
            openCIFS.run(cache, {}, (err, results) => {
                expect(results.length).to.equal(1);
                expect(results[0].status).to.equal(3);
                expect(results[0].region).to.equal('global');
                done();
            });
        });

        it('should not return anything if describe firewall rules response not found', function (done) {
            const cache = createNullCache();
            openCIFS.run(cache, {}, (err, results) => {
                expect(results.length).to.equal(0);
                done();
            });
        });

    });
});
