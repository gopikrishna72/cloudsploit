var ocirest = require('../../utils/ocirest.js');
var endpoint = require('../../configs/endpoints.js');

function connect( auth, parameters, callback ) {
  var possibleHeaders = [];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
    ocirest.process( auth,
                     { path : auth.RESTversion + 
                              '/remotePeeringConnections' + encodeURIComponent(parameters.remotePeeringConnectionId) +
                              '/actions/connect',
                       host : endpoint.service.core[auth.region],
                       method : 'POST',
                       headers : headers,
                       body : parameters.body },
                      callback )
  }

function create( auth, parameters, callback ) {
  var possibleHeaders = ['opc-retry-token'];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
    ocirest.process( auth,
                     { path : auth.RESTversion + '/remotePeeringConnections',
                       host : endpoint.service.core[auth.region],
                       method : 'POST',
                       body : parameters.body,
                       headers : headers },
                      callback )
  }

function drop( auth, parameters, callback ) {
  var possibleHeaders = ['if-match'];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
    ocirest.process( auth,
                     { path : auth.RESTversion + 
                      '/remotePeeringConnections/' + encodeURIComponent(parameters.remotePeeringConnectionId),
                       host : endpoint.service.core[auth.region],
                       method : 'DELETE',
                       headers : headers },
                      callback )
  }

function get( auth, parameters, callback ) {
  var possibleHeaders = [];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
    ocirest.process( auth, 
                     { path : auth.RESTversion + 
                              '/remotePeeringConnections/' + encodeURIComponent(parameters.remotePeeringConnectionId),
                       host : endpoint.service.core[auth.region],
                       headers : headers,
                       method : 'GET' }, 
                     callback );
  }

function list( auth, parameters, callback ) {
  var possibleHeaders = [];
  var possibleQueryStrings = ['compartmentId', 'drgId', 'limit', 'page'];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
  var queryString = ocirest.buildQueryString( possibleQueryStrings, parameters );
    ocirest.process( auth, 
                     { path : auth.RESTversion + '/remotePeeringConnections' + queryString,
                       host : endpoint.service.core[auth.region],
                       headers : headers,
                       method : 'GET' }, 
                     callback );
  }

function update( auth, parameters, callback ) {
  var possibleHeaders = ['if-match'];
  var headers = ocirest.buildHeaders( possibleHeaders, parameters );
    ocirest.process( auth, 
                     { path : auth.RESTversion + 
                              '/remotePeeringConnections/' + encodeURIComponent(parameters.remotePeeringConnectionId),
                       host : endpoint.service.core[auth.region],
                       headers : headers,
                       body : parameters.body,
                       method : 'PUT' }, 
                     callback );
  }
  
  module.exports={
      list: list,
      drop: drop,
      update: update,
      create: create,
      connect: connect,
      get: get
  }