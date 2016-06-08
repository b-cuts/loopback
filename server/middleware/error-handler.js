// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var strongErrorHandler = require('strong-error-handler');
strongErrorHandler.title = 'Loopback';

module.exports = errorHandler;

function  errorHandler(options) {
  if (!options || options.debug !== false) {
    return strongErrorHandler(options);
  } else {
    throw new Error('expressHandler is not available. Please use strong-error-handler');
  }
};
