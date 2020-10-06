var async = require('async');
var exports = require('./exports.js');
var suppress = require('./postprocess/suppress.js');
var output = require('./postprocess/output.js');
var helpers = require('./helpers/shared');
var once = require('lodash.once');

/**
 * The main function to execute CloudSploit scans.
 * @param cloudConfig The configuration for the cloud provider.
 * @param settings General purpose settings.
 * @param [outputHandler] Optional custom handler for result collection.
 * @param [callback] callback to be ran upon completion.
 */
var engine = function(cloudConfig, settings, outputHandler, callback) {
    // Initialize any suppression rules based on the the command line arguments
    var suppressionFilter = suppress.create(settings.suppress);

    // Initialize the output handler
    outputHandler = outputHandler || output.create(process.argv);

    // Configure Service Provider Collector
    var collector = require(`./collectors/${settings.cloud}/collector.js`);
    var plugins = exports[settings.cloud];
    var apiCalls = [];

    // Print customization options
    if (settings.compliance) console.log(`INFO: Using compliance modes: ${settings.compliance.join(', ')}`);
    if (settings.govcloud) console.log('INFO: Using AWS GovCloud mode');
    if (settings.china) console.log('INFO: Using AWS China mode');
    if (settings.ignore_ok) console.log('INFO: Ignoring passing results');
    if (settings.skip_paginate) console.log('INFO: Skipping AWS pagination mode');
    if (settings.suppress && settings.suppress.length) console.log('INFO: Suppressing results based on suppress flags');
    if (settings.plugin) {
        if (!plugins[settings.plugin]) return console.log(`ERROR: Invalid plugin: ${settings.plugin}`);
        console.log(`INFO: Testing plugin: ${plugins[settings.plugin].title}`);
    }

    // STEP 1 - Obtain API calls to make
    console.log('INFO: Determining API calls to make...');

    var skippedPlugins = [];

    Object.entries(plugins).forEach(function(p){
        var pluginId = p[0];
        var plugin = p[1];
        // Skip plugins that don't match the ID flag
        var skip = false;
        if (settings.plugin && settings.plugin !== pluginId) {
            skip = true;
        }
        else if (settings.skipPlugins) {
            if (Array.isArray(settings.skipPlugins)) {
                if (settings.skipPlugins.includes(pluginId)) {
                    skip = true;
                    console.debug(`DEBUG: Skipping plugin ${plugin.title} because it is within skipPlugins`);
                }
            }
            else {
                // assumes type is String
                let asArray = settings.skipPlugins.split(',');
                if (asArray.includes(pluginId)) {
                    skip = true;
                    console.debug(`DEBUG: Skipping plugin ${plugin.title} because it is within skipPlugins`);
                }
            }
        }
        else {
            // Skip GitHub plugins that do not match the run type
            if (settings.cloud == 'github') {
                if (cloudConfig.organization &&
                    plugin.types.indexOf('org') === -1) {
                    skip = true;
                    console.debug(`DEBUG: Skipping GitHub plugin ${plugin.title} because it is not for Organization accounts`);
                } else if (!cloudConfig.organization &&
                    plugin.types.indexOf('org') === -1) {
                    skip = true;
                    console.debug(`DEBUG: Skipping GitHub plugin ${plugin.title} because it is not for User accounts`);
                }
            }

            if (settings.compliance && settings.compliance.length) {
                if (!plugin.compliance || !Object.keys(plugin.compliance).length) {
                    skip = true;
                    console.debug(`DEBUG: Skipping plugin ${plugin.title} because it is not used for compliance programs`);
                } else {
                    // Compare
                    var cMatch = false;
                    settings.compliance.forEach(function(c){
                        if (plugin.compliance[c]) cMatch = true;
                    });
                    if (!cMatch) {
                        skip = true;
                        console.debug(`DEBUG: Skipping plugin ${plugin.title} because it did not match compliance programs ${settings.compliance.join(', ')}`);
                    }
                }
            }
        }
        if (skip) {
            skippedPlugins.push(pluginId);
        } else {
            plugin.apis.forEach(function(api) {
                if (apiCalls.indexOf(api) === -1) apiCalls.push(api);
            });
        }
    });

    if (!apiCalls.length) return console.log('ERROR: Nothing to collect.');

    console.log(`INFO: Found ${apiCalls.length} API calls to make for ${settings.cloud} plugins`);
    console.log('INFO: Collecting metadata. This may take several minutes...');

    // STEP 2 - Collect API Metadata from Service Providers
    collector(cloudConfig, {
        api_calls: apiCalls,
        paginate: settings.skip_paginate,
        govcloud: settings.govcloud,
        china: settings.china
    }, function(err, collection) {
        if (err || !collection || !Object.keys(collection).length) return console.log(`ERROR: Unable to obtain API metadata: ${err || 'No data returned'}`);
        outputHandler.writeCollection(collection, settings.cloud);

        console.log('INFO: Metadata collection complete. Analyzing...');
        console.log('INFO: Analysis complete. Scan report to follow...');

        var maximumStatus = 0;

        async.mapValuesLimit(plugins, 10, function(plugin, key, pluginDone) {
            pluginDone = once(pluginDone);
            if (skippedPlugins.indexOf(key) > -1) return pluginDone(null, 0);

            try {
                plugin.run(collection, settings, function(err, results) {
                    for (var r in results) {
                        // If we have suppressed this result, then don't process it
                        // so that it doesn't affect the return code.
                        if (suppressionFilter([key, results[r].region || 'any', results[r].resource || 'any'].join(':'))) {
                            continue;
                        }

                        var complianceMsg = [];
                        if (settings.compliance && settings.compliance.length) {
                            settings.compliance.forEach(function(c){
                                if (plugin.compliance && plugin.compliance[c]) {
                                    complianceMsg.push(`${c.toUpperCase()}: ${plugin.compliance[c]}`);
                                }
                            });
                        }
                        complianceMsg = complianceMsg.join('; ');
                        if (!complianceMsg.length) complianceMsg = null;

                        // Write out the result (to console or elsewhere)
                        outputHandler.writeResult(results[r], plugin, key, complianceMsg);

                        // Add this to our tracking fo the worst status to calculate
                        // the exit code
                        maximumStatus = Math.max(maximumStatus, results[r].status);
                    }

                    setTimeout(function() { pluginDone(err, maximumStatus); }, 0);
                });
            } catch (error) { // TODO review this to ensure correctness!
                outputHandler.writeResult({
                    status: 3,
                    region: 'unknown',
                    resource: null,
                    custom: false,
                    message: helpers.addError(error)
                }, plugin, key);
                maximumStatus = 3;
                setTimeout(function() { pluginDone(err, maximumStatus); }, 0);
            }
        }, function(err) {
            if (err) return console.log(err);
            // console.log(JSON.stringify(collection, null, 2));
            outputHandler.close();
            if (settings.exit_code) {
                // The original cloudsploit always has a 0 exit code. With this option, we can have
                // the exit code depend on the results (useful for integration with CI systems)
                console.log(`INFO: Exiting with exit code: ${maximumStatus}`);
                process.exitCode = maximumStatus;
            }
            console.log('INFO: Scan complete');
            if (callback) {
                callback(err);
            }
        });
    });
};

module.exports = engine;
