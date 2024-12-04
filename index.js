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

// error tags prior to color/log package load
const red_start = "\u001b[31m"; 
const red_end = "\u001b[0m";

////////////////////////////////////////////////////////////////////////////////
// First, create a universal error handler not reliant on external packages 
process.on('uncaughtException', err => {
  var dup_instance = false; 
  if(err.code != null)
  {
    if(err.code.toString() == "EBUSY")
    {
      console.log(`${red_start}Failure to start program. Ensure duplicate instances are not running${red_end}`);
      dup_instance = true;
    }
  }
  if(!dup_instance)
  {
    console.log(`${red_start}Program encountered an error, see log${red_end}`);
    console.log(err);
  }
  
  console.log(`${red_start}Press any key to exit${red_end}`);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
});
////////////////////////////////////////////////////////////////////////////////

console.log("--------------------")
console.log("C550 utility tool")
var version = require('./package.json').version;
console.log(`Verison: ${version}`);
console.log("--------------------")

// Load remaining libs
const serial_listen = require('./src/serial_layer');
const { SerialPort } = require('serialport');
const c550_lib = require("./src/c550_lib");
const log = require("./src/log");
const args = require("./src/args");
var a2l = require("./src/a2l_modbus");


// Setup CLI arguments
var opt_args = {file:c550_lib.config_path, mode:'config', adr:0, port:'null', run_once: 0};
args({},opt_args,true);
c550_lib.config_path = opt_args.file;
a2l.comm_port = opt_args.port;
a2l.config_adr = opt_args.adr;
a2l.exit_on_pass = opt_args.run_once;
c550_lib.exit_on_pass = opt_args.run_once;

if(opt_args.mode == 'config')
{
  // Test config file
  c550_lib.test_config_path();

  // Setup serial system
  var serial_listener = new serial_listen();

  serial_listener.listen();

  serial_listener.on('port_added', async (port)=>{

    log.info(`New serial port detected: ${port.path}`);
    c550_lib.test_command(port.path);
  })

  serial_listener.on('port_lost', (port)=>{
    log.warn(`Lost serial port: ${port.path}`);
  })
}else if(opt_args.mode == 'a2l')
{
  var scan_only = false;
  if(opt_args.port == 'null')
  {
    throw('Must specify -port argument in a2l mode such as -port COM5');
  }
  if(opt_args.adr == 0)
  {
    scan_only = true;
  }
  else if(a2l.a2l_addresses.includes(opt_args.adr) == false)
  {
    throw('Valid addresses are 0x40-0x45 and 0x55');
  }
  a2l.start_server(scan_only);
}else if(opt_args.mode == 'update')
{
  c550_lib.test_update_path();
  c550_lib.test_update(opt_args.port);
}

