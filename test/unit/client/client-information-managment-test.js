/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-lwm2m-lib
 *
 * iotagent-lwm2m-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-lwm2m-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-lwm2m-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */

'use strict';

var should = require('should'),
    async = require('async'),
    apply = async.apply,
    lwm2mServer = require('../../../').server,
    lwm2mClient = require('../../../').client,
    config = require('../../../config'),
    testInfo = {};

describe.only('Client-side information management', function() {
    var deviceInformation,
        deviceId;

    beforeEach(function(done) {
        lwm2mServer.start(config.server, function (error, srvInfo) {
            testInfo.serverInfo = srvInfo;

            lwm2mClient.register('localhost', config.server.port, 'testEndpoint', function (error, result) {
                deviceInformation = result;
                deviceId = deviceInformation.location.split('/')[2];
                lwm2mClient.registry.create('/3/6', done);
            });
        });
    });

    afterEach(function(done) {
        async.series([
            apply(lwm2mClient.registry.remove, '/3/6'),
            apply(lwm2mClient.unregister, deviceInformation),
            apply(lwm2mServer.stop, testInfo.serverInfo)
        ], done);
    });

    describe('When a write request arrives to the client', function() {
        var obj = {
            type: '3',
            id: '6',
            resource: '1',
            value: 'TheValue'
        };

        it('should change the appropriate value in the selected object', function (done) {
            var handlerCalled = false;

            lwm2mClient.setHandler(deviceInformation.serverInfo, 'write',
                function (objectType, objectId, resourceId, value, callback) {
                    should.exist(objectType);
                    should.exist(objectId);
                    should.exist(resourceId);
                    should.exist(value);
                    objectType.should.equal(obj.type);
                    objectId.should.equal(obj.id);
                    resourceId.should.equal(obj.resource);
                    value.should.equal(obj.value);
                    handlerCalled = true;
                    callback();
                });

            lwm2mServer.write(deviceId, obj.type, obj.id, obj.resource, obj.value, function(error) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                done();
            });
        });
    });
    describe('When a read request arrives to the client for an existent resource of an existent object', function() {
        var obj = {
            type: '3',
            id: '6',
            resource: '2',
            value: 'ValueToBeRead',
            uri: '/3/6'
        };

        beforeEach(function(done) {
            lwm2mClient.registry.setAttribute(obj.uri, obj.resource, obj.value, done);
        });
        afterEach(function(done) {
            lwm2mClient.registry.unsetAttribute(obj.uri, obj.resource, done);
        });
        it('should send a response with the required object value', function(done) {
            var handlerCalled = false;

            lwm2mClient.setHandler(deviceInformation.serverInfo, 'read',
                function (objectType, objectId, resourceId, resourceValue, callback) {
                    should.exist(objectType);
                    should.exist(objectId);
                    should.exist(resourceId);
                    objectType.should.equal(obj.type);
                    objectId.should.equal(obj.id);
                    resourceId.should.equal(obj.resource);
                    handlerCalled = true;
                    callback(null, resourceValue);
                });

            lwm2mServer.read(deviceId, obj.type, obj.id, obj.resource, function(error, result) {
                should.not.exist(error);
                should.exist(result);
                result.should.equal(obj.value);
                handlerCalled.should.equal(true);
                done();
            });
        });
    });
    describe('When a read request arrives to the client for an unexistent object instance', function() {
        it('should raise a 4.04 OBJECT_NOT_FOUND error');
    });
    describe('When a read request arrives to the client for an unexistent resource of an object', function() {
        it('should raise a 4.04 RESOURCE_NOT_FOUND error');
    });
});