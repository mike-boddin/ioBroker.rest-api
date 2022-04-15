const expect = require('chai').expect;
const setup = require('./lib/setup');
const axios = require('axios');
const adapterName = require('../package.json').name.split('.').pop();

let objects = null;
let states = null;

process.env.NO_PROXY = '127.0.0.1';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        cb && cb('Cannot check connection');
        return;
    }

    states.getState(`system.adapter.${adapterName}.0.alive`, (err, state) => {
        err && console.error(err);
        if (state && state.val) {
            cb && cb();
        } else {
            setTimeout(() =>
                checkConnectionOfAdapter(cb, counter + 1), 1000);
        }
    });
}

describe('Test REST API SSL', function () {
    before('Test REST API SSL: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm
        setup.adapterStarted = false;

        setup.setupController(async function () {
            const config = await setup.getAdapterConfig();
            // enable adapter
            config.common.enabled = true;
            config.common.loglevel = 'debug';
            config.native.port = 18183;
            config.native.auth = true;
            config.native.secure = true;
            config.native.certPublic = 'defaultPublic';
            config.native.certPrivate = 'defaultPrivate';

            await setup.setAdapterConfig(config.common, config.native);

            setup.startController(function (_objects, _states) {
                objects = _objects;
                states = _states;
                // give some time to start server
                setTimeout(() =>
                    _done(), 2000);
            });
        });
    });

    it('Test REST API SSL: Check if adapter started and create upload datapoint', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(async res => {
            res && console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            done();
        });
    });

    it('Test REST API SSL: get - must return value', function (done) {
        this.timeout(2000);
        axios.get(`https://127.0.0.1:18183/v1/state/system.adapter.${adapterName}.0.alive?user=admin&pass=iobroker`)
            .then(response => {
                const obj = response.data;
                console.log(`[GET] /v1/state/system.adapter.${adapterName}.0.alive?user=admin&pass=iobroker => ${JSON.stringify(obj)}`);
                //{
                //    "val" : true,
                //    "ack" : true,
                //    "ts" : 1455009717,
                //    "q" : 0,
                //    "from" : "system.adapter.${adapterName}.0",
                //    "lc" : 1455009717,
                //    "expire" : 30000,
                //    "_id" : "system.adapter.${adapterName}.0.alive",
                //    "type" : "state",
                //    "common" : {
                //      "name" : "${adapterName}.0.alive",
                //        "type" : "boolean",
                //        "role" : "indicator.state"
                //       },
                //    "native" : {}
                //
                //}

                expect(obj).to.be.ok;
                expect(obj.val).to.be.true;
                expect(obj.ack).to.be.true;
                expect(obj.ts).to.be.ok;
                expect(obj.from).to.equal(`system.adapter.${adapterName}.0`);
                done();
            });
    });

    it('Test REST API SSL: get - must return value with auth in header', function (done) {
        this.timeout(2000);
        axios.get(`https://127.0.0.1:18183/v1/state/system.adapter.${adapterName}.0.alive`, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('admin:iobroker').toString('base64')
            }
        })
            .then(response => {
                const obj = response.data;
                console.log(`[GET/Authorization] /v1/state/system.adapter.${adapterName}.0.alive => ${JSON.stringify(obj)}`);
                expect(response.status).to.be.equal(200);
                expect(obj).to.be.ok;
                expect(obj.val).to.be.true;
                expect(obj.ack).to.be.true;
                expect(obj.ts).to.be.ok;
                expect(obj.from).to.equal(`system.adapter.${adapterName}.0`);
                done();
            });
    });

    it('Test REST API SSL: get with no credentials', function (done) {
        this.timeout(2000);
        axios.get(`https://127.0.0.1:18183/v1/state/system.adapter.${adapterName}.0.alive`, {validateStatus: () => true})
            .then(response => {
                console.log(`[GET] /v1/state/system.adapter.${adapterName}.0.alive => ${JSON.stringify(response.data)}`);
                expect(response.status).to.be.equal(401);
                done();
            })
            .catch(error => {
                console.error('Error in response: ' + error);
                expect(error).to.be.not.ok;
            });
    });

    it('Test REST API SSL: get with wrong credentials', function (done) {
        this.timeout(2000);
        axios.get(`https://127.0.0.1:18183/v1/state/system.adapter.${adapterName}.0.alive?user=admin&pass=io`, {validateStatus: () => true})
            .then(response => {
                console.log(`[GET] /v1/state/system.adapter.${adapterName}.0.alive?user=admin&pass=io => ${JSON.stringify(response.data)}`);
                expect(response.status).to.be.equal(401);
                done();
            })
            .catch(error => {
                console.error('Error in response: ' + error);
                expect(error).to.be.not.ok;
            });
    });

    it('Test REST API SSL: get - get with wrong credentials in header', function (done) {
        this.timeout(2000);
        axios.get(`https://127.0.0.1:18183/v1/state/system.adapter.${adapterName}.0.alive`, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('admin:io').toString('base64')
            },
            validateStatus: () => true
        })
            .then(response => {
                console.log(`[GET/Authorization] /v1/state/system.adapter.${adapterName}.0.alive => ${JSON.stringify(response.data)}`);
                expect(response.status).to.be.equal(401);
                done();
            });
    });

    after('Test REST API SSL: Stop js-controller', function (done) {
        this.timeout(6000);
        setup.stopController(normalTerminated => {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
