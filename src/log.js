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

var log = {};

const fs = require("fs");
const homedir = require('os').homedir();
var colors = require('colors');

log.debug_logging_enabled = false;
log.log_file_enabled = false;
log.debug_log_file_enabled = false;

var date = new Date(Date.now());
var date_string = "_"+(date.getMonth()+1)+"_"+date.getDate()+"_"+date.getUTCFullYear();

var log_file_dir = homedir + "/jci_logs";
var log_file_path = log_file_dir + "/cwcvt_logs" + date_string + ".txt";
var log_debug_file_path = log_file_dir + "/cwcvt_debug_logs" + date_string + ".txt";;
var database_file_path = log_file_dir + "/cwcvt_database.txt";

function init_logger()
{
  try{
    fs.mkdirSync(log_file_dir);
  }catch(e)
  {

  }
}
init_logger();


function log_to_file(message, verbose)
{
  message += '\r\n';
  try{
    if(log.log_file_enabled && (!verbose))
    {
      fs.appendFileSync(log_file_path, message);
    }
    if(log.debug_log_file_enabled)
    {
      fs.appendFileSync(log_debug_file_path, message);
    }
  }catch(e)
  {

  }
}

function print(message)
{
  var msg = '[I]'.green + `[${(new Date()).toISOString()}] `.gray + message;
  process.stdout.write(msg);
  log_to_file(msg, false);
}
log.print = print;

function info(message)
{
  var msg = '[I]'.green + `[${(new Date()).toISOString()}] `.gray + message;
  console.log(msg);
  log_to_file(msg, false);
}
log.info = info;

function warn(message)
{
  var msg = '[W]'.yellow + `[${(new Date()).toISOString()}] `.gray + message.yellow;
  console.log(msg);
  log_to_file(msg, false);
}
log.warn = warn;

function pass(message)
{
  var msg = '[P]'.brightGreen + `[${(new Date()).toISOString()}] `.gray + message.brightGreen;
  console.log(msg);
  log_to_file(msg, false);
}
log.pass = pass;


function debug(message)
{
  var msg = '[D]'.yellow + `[${(new Date()).toISOString()}] `.gray + message;
  log_to_file(msg, true);
  if(log.debug_logging_enabled)
  {
    console.log(msg);
  }
}
log.debug = debug;


function error(message)
{
  var msg = '[E]'.red + `[${(new Date()).toISOString()}] `.gray + message.red;
  console.log(msg);
  log_to_file(msg, false);
}
log.error = error;


function database_program_success(mac, fw_version)
{
  var message = `${(new Date()).toISOString()}, passed, ${fw_version}, ${mac}\r\n`;
  try{
    fs.appendFileSync(database_file_path, message)
  }
  catch(e){

  }
}
log.database_program_success = database_program_success;


module.exports = log;
