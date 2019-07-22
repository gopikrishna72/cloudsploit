var ocirest = require('../../utils/ocirest.js');
var endpoint = require('../../configs/endpoints.js');

function drop( auth, parameters, callback ) {
  var possibleHeaders = [];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
  ocirest.process( auth,
                   { path : '/itas/' + encodeURIComponent(parameters.domain) +
                            '/myservices/api' + auth.RESTversion +
                            '/serviceInstances/' + encodeURIComponent(parameters.serviceInstanceId) +
                            '/serviceConfigurations/' + encodeURIComponent(parameters.serviceConfigurationId) +
                            '/securityGroupAssignment/' + encodeURIComponent(parameters.id),
                     host : endpoint.service.myServices,
                     headers : headers,
                     method : 'DELETE' },
                    callback );
}

function get( auth, parameters, callback ) {
  var possibleHeaders = [];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
  ocirest.process( auth,
                   { path : '/itas/' + encodeURIComponent(parameters.domain) +
                            '/myservices/api' + auth.RESTversion +
                            '/serviceInstances/' + encodeURIComponent(parameters.serviceInstanceId) +
                            '/serviceConfigurations/' + encodeURIComponent(parameters.serviceConfigurationId) +
                            '/securityGroupAssignment/' + encodeURIComponent(parameters.id),
                     host : endpoint.service.myServices,
                     headers : headers,
                     method : 'GET' },
                    callback );
}


module.exports = {
    get: get,
    drop: drop
    };