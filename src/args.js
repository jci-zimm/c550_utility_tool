"use strict";

/**
  MIT License
  Copyright (c) 2024 Johnson Controls International Plc

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

/**
 * 
 * @param {object} argList - A object of required args. E.g. {port:0, name:''} 
 * @param {*} optArgList - A object of optional args E.g. {logFile:"default"}
 * @param {*} ignoreRequired - boolean to ignore required args 
 */
function process_args(argList, optArgList, ignoreRequired) {
    // Process required input arguments in argList 
    var allArgs = true;

    for (var arg in argList) {
        var argI = process.argv.indexOf('-' + arg);
        if (argI == -1) {
            //console.log('You must specify the -' + arg + ' argument.');
            allArgs = false;
        } else {
            var val = process.argv[argI + 1];
            //argList[arg] = val;
            switch (typeof (argList[arg])) { // Ensure types are consistent 
                case 'number':
                    argList[arg] = parseInt(val);
                    break;
                case 'string':
                    argList[arg] = val;
                    break;
                default:
                    argList[arg] = val;
                    break;
            }
            //console.log('Setting arg: ' + arg + ', to : ' + val);
        }
    }

    // Return if not all required args are entered
    if ((!allArgs) && (ignoreRequired != true)) {
        process.exit(1);
    }

    // Optional Args 
    for (var arg in optArgList) {
        var argI = process.argv.indexOf('-' + arg);
        if (argI != -1) {
            var val = process.argv[argI + 1];
            switch (typeof (optArgList[arg])) { // Ensure types are consistent 
                case 'number':
                    optArgList[arg] = parseInt(val);
                    break;
                case 'string':
                    optArgList[arg] = val;
                    break;
                default:
                    optArgList[arg] = val;
                    break;
            }
            // console.log('Setting arg: ' + arg + ', to : ' + val);
        }
    }
    return allArgs;
}

module.exports = process_args;
