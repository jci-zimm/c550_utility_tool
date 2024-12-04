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

const SYS_BAUD_RATE = 115200;

const { SerialPort } = require('serialport');
const fs = require("fs");
var u = require("./local_util");
const log = require("./log");
var colors = require('colors');

var stat = {STATUS_OK : 0, ERROR_DEFAULT: -1, ERROR_TIMEOUT: -2, STATUS_PENDING: 1};
var c550_lib = {};

var default_path = 'c550_config_default.txt';
c550_lib.config_path = default_path;

/**
 * @brief returns a promise that completes when port is open
 * @param {*} port add port, e.g. "COM5"
 * @param {*} timeout timeout duration in ms for port to open
 * @returns 
 */
async function sync_open_port(port,timeout)
{
  return new Promise(async function (resolve, reject) {
    var s_opts = {baudRate: SYS_BAUD_RATE, path: port};
    // console.log(port);
    var s_port = new SerialPort(s_opts, (err)=>{
      if(err == null)
      {
        resolve(s_port)
      }else
      {
        reject(err)
      }
    });
    if(s_port.isOpen)
    {
      resolve('ok');
    }
    setTimeout(()=>{reject('timeout')}, timeout);
  });
}

/**
 * @breif Executes a serial command and provides a callback to parse the results 
 * @param {*} comm_port comm port to execute command on 
 * @param {*} command Serial command to send 
 * @param {*} timeout_value How long to allow the serial command to run before killing it
 * @param {*} write_attempts How many times to attempt the write
 * @param {*} parse_cb The callback which will be called with parse_cb(output_data)
 * @returns 
 */
async function run_serial_command(comm_port, command, timeout_value, write_attempts, parse_cb)
{
  return new Promise(async function (resolve, reject) {
    var res = {};
    res.code = stat.ERROR_TIMEOUT;
    res.output = `Failed command: ${command}`;
    var output_data = "";

    try
    {
      var port = {};

      // Kill promise after timeout_value time
      setTimeout(()=>{
        if(res.code == stat.ERROR_TIMEOUT)
        {
          log.debug(`Closing ${comm_port} due to timeout`);
        }
        if(port.isOpen){
          port.close(); // kill port if open 
        }else{
          resolve(res);
        }
      }, timeout_value);

      port = await sync_open_port(comm_port, 1000);
      // Kill promise if port closes
      port.on('close', function (data) {
        resolve(res);
      });

      // Kill promise on error, kill port if open
      port.on('error', (e)=>{
        log.debug(`Error ${comm_port}: ${e.toString()}`);
        if(port.isOpen){
          port.close(); // kill port if open
        }else{
          resolve(res);
        }
      });

      port.on('data', (data)=>{
        try{
          log.debug(`Data ${comm_port}: ${data.toString()}`);
          output_data += data;
          var parse_res = parse_cb(output_data);
          if(parse_res.code == stat.STATUS_OK)
          {
            res.code = stat.STATUS_OK;
            res.output = "Test Passed";
            res.data = parse_res.data;
            port.close();
          }
          else if(parse_res.code == stat.ERROR_DEFAULT)
          {
            res.code = stat.ERROR_DEFAULT;
            port.close();
          }
        }catch(e)
        {

        }
      })

      for(var i = 0; i < write_attempts; i++)
      {
        if(port.isOpen)
        {
          port.write(command);
          log.debug(`Writing, ${comm_port}: ${command}`);
        }
        else
        {
          return;
        }
        await u.sleep(1000);
      }

    }catch(e)
    {
      log.debug(e);
    }
  });
}

/**
 * @brief Function parses C550 wifi-status command and extracts the C550 AP's SSID
 * @param {*} data - Serial data from 
 * @returns an object with a status code that shows success if SSID is found
 */
function parse_ota_len_cb(data)
{
  var ret = {code : stat.STATUS_PENDING};
  //log.debug("Got data: ");
  //log.debug(data);
  var lines = data.split('\r');
  lines.pop(); // remove last line since its either not complete or blank
  for(var line of lines)
  {
    if(line.includes(">update,len,ACK"))
    {
      ret.code = stat.STATUS_OK;
      break;
    }
    if(line.includes(">update,FAIL"))
    {
      ret.code = stat.ERROR_DEFAULT;
      break;
    }
  }
  return ret;
}


/**
 * @brief Function parses C550 wifi-status command and extracts the C550 AP's SSID
 * @param {*} data - Serial data from 
 * @returns an object with a status code that shows success if SSID is found
 */
function parse_ota_data_cb(data)
{
  var ret = {code : stat.STATUS_PENDING};
  //log.debug("Got data: ");
  //log.debug(data);
  var lines = data.split('\r');
  lines.pop(); // remove last line since its either not complete or blank
  for(var line of lines)
  {
    if(line.includes(">update,data,"))
    {
      ret.code = stat.STATUS_OK;
      break;
    }
    if(line.includes(">update,FAIL"))
    {
      ret.code = stat.ERROR_DEFAULT;
      break;
    }
  }
  return ret;
}


/**
 * @brief Function parses C550 wifi-status command and extracts the C550 AP's SSID
 * @param {*} data - Serial data from 
 * @returns an object with a status code that shows success if SSID is found
 */
function parse_mac_cb(data)
{
  var ret = {code : stat.STATUS_PENDING};
  log.debug("Got data: ");
  log.debug(data);
  var lines = data.split('\r');
  lines.pop(); // remove last line since its either not complete or blank
  for(var line of lines)
  {
    if(line.includes("SSID: C550"))
    {
      var c550_ssid = line.split('SSID: ')[1];
      log.info(`Detected: ${c550_ssid}`);
      ret.code = stat.STATUS_OK;
      ret.data = {ssid:c550_ssid};
      break;
    }
  }
  return ret;
}

function parse_config_cb(data)
{
  var ret = {code : stat.STATUS_PENDING};
  log.debug("Got data: ");
  log.debug(data);
  var lines = data.split('\r');
  for(var line of lines)
  {
    if(line.includes(">json-cfg,OK"))
    {
      ret.code = stat.STATUS_OK;
      break;
    }
    if(line.includes(">json-cfg,FAIL"))
    {
      ret.code = stat.ERROR_DEFAULT;
      break;
    }
  }
  return ret;
}

/**
 * @brief This function verifies that the config file exists
 */
function test_config_path()
{
  try{
    if(default_path == c550_lib.config_path)
    {
      log.info(`Loading default config file from ./${default_path}. To change this, use *.exe -file [filename] argument`)
    }
    else
    {
      log.info(`Loading config file from ./${c550_lib.config_path}`)
    }
    var config_text = fs.readFileSync(c550_lib.config_path).toString();
    log.info(`Connect a C550 via USB to begin loading configurations`)
  }catch(e)
  {
    log.error(`Config load issue: ${e.message}`);
  }
}
c550_lib.test_config_path = test_config_path;

/**
 * This function verifies that the update file exists
 */
function test_update_path()
{
  try{
    log.info(`Loading update file from ./${c550_lib.config_path}`)
    var update_data = fs.readFileSync(c550_lib.config_path).toString();
  }catch(e)
  {
    log.error(`Update file load issue: ${e.message}`);
  }
}
c550_lib.test_update_path = test_update_path;

/**
 * @brief This function will attempt to perform an update on the USB device specified
 * @param {*} comm_port - A string denoting the comm port such as "COM5"
 * @returns 
 */
async function test_update(comm_port)
{
  try{
    var update = fs.readFileSync(c550_lib.config_path);
    await u.sleep(5000); // boot time
    var c550 = {};
    var data = await run_serial_command(comm_port, "\r\n\r\nwifi-status\r\n", 5000, 1, parse_mac_cb);
    if(data.code == stat.STATUS_OK)
    {
      log.debug(`SSID : ${data.data.ssid}`);
      c550.ssid = data.data.ssid;
    }
    else
    {
      log.error(`Could not communicate with: ${comm_port}`);
      return;
    }
    data = await run_serial_command(comm_port, `\r\nupdate --len ${update.length}\r\n`, 5000, 1, parse_ota_len_cb);
    var tick = Date.now();
    if(data.code == stat.STATUS_OK)
    {
      var len_sent = 0;
      var batch_size = 2*1024;
      while(len_sent < update.length)
      {
        var buf = update.slice(len_sent, len_sent + batch_size);
        var block = await run_serial_command(comm_port, `\r\nupdate --data ${buf.toString('base64')}\r\n`, 5000, 1, parse_ota_data_cb);
        if(block.code == stat.STATUS_OK)
        {
          len_sent +=buf.length;
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          log.print(`DEV ${c550.ssid} update: ${len_sent/1024}KB of ${update.length/1024}KB, ${(100*len_sent/update.length).toFixed(2)}%, time: ${((Date.now() - tick)/1000).toFixed(2)}s`);
        }
        else
        {
          log.error(`Update file issue: ${len_sent}`);
          return;
        }
        await u.sleep(1);
      }
      process.stdout.write('\r\n');
      log.pass(`SUCCESS. Loaded update`);
      process.exit(0);
    }
    else
    {
      log.error(`Update device issue, command not supported?: ${len_sent}`);
      return;
    }

  }catch(e)
  {
    log.error(`Error with load attempt: ${comm_port}, ${e.message}`);
  }
}
c550_lib.test_update = test_update;

/**
 * @brief This function will attempt to async load into a config onto the device specified by the comm port
 * @param {} comm_port - A string denoting the comm port such as "COM5"
 * @returns 
 */
async function test_command(comm_port)
{
  try{
    var config_text = fs.readFileSync(c550_lib.config_path).toString();
    log.info(`Loading config into: ${comm_port}`);
    await u.sleep(5000); // boot time
    var c550 = {};
    var data = await run_serial_command(comm_port, "\r\n\r\nwifi-status\r\n", 5000, 3, parse_mac_cb);
    if(data.code == stat.STATUS_OK)
    {
      log.debug(`SSID : ${data.data.ssid}`);
      c550.ssid = data.data.ssid;
    }
    else
    {
      log.error(`Could not communicate with: ${comm_port}`);
      return;
    }
  
    data = await run_serial_command(comm_port, `\r\n\r\nconfig ${config_text}\r\n`, 5000, 3, parse_config_cb);
    if(data.code == stat.STATUS_OK)
    {
      log.pass(`SUCCESS. Loaded config into: ${comm_port}, ${c550.ssid}`);
      if(c550_lib.exit_on_pass)
      {
        process.exit(0);
      }
    }
    else if(data.code == stat.ERROR_DEFAULT)
    {
      log.error(`ERROR. Invalid Config: ${comm_port}, ${c550.ssid}`);
    }
    else
    {
      log.error(`Could not load config into: ${comm_port}, ${c550.ssid}`);
    }
  }catch(e)
  {
    log.error(`Error with load attempt: ${comm_port}, ${e.message}`);
  }
}
c550_lib.test_command = test_command;
c550_lib.exit_on_pass = false;

module.exports = c550_lib;
