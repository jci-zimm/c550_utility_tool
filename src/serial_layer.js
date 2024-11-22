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

"use strict";

const { SerialPort } = require('serialport')
const event_emitter = require('events');
var u = require("./local_util");

let serial_port_list = [];
const SERIAL_PORT_POLL_INTERVAL = 500; //ms

class serial_list_update extends event_emitter {
  constructor(){
      super();
  }

  listen(){
    serial_port_list_poll(this)
  }
}


async function detect_serial_port_change(emitter)
{
  var new_port_list = await SerialPort.list();

  // Search through to find new ports 
  for(var port of new_port_list)
  {
    var port_found = false; 
    for(var existing_port of serial_port_list)
    {
      if(existing_port.path == port.path)
      {
        port_found = true;
        break;
      }
    }
    if(!port_found)
    {
      if(emitter != null)
      {
        emitter.emit("port_added",port);
      }
    }
  }

  // Search for lost ports 
  for(var port of serial_port_list)
  {
    var port_found = false; 
    for(var new_port of new_port_list)
    {
      if(new_port.path == port.path)
      {
        port_found = true;
        break;
      }
    }
    if(!port_found)
    {
      if(emitter !=null)
      {
        emitter.emit("port_lost",port);
      }
    }
  }

  serial_port_list = new_port_list;
}


async function serial_port_list_poll(emitter)
{
  await detect_serial_port_change(null); // Establish baseline

  while(1)
  {
    detect_serial_port_change(emitter);
    await u.sleep(SERIAL_PORT_POLL_INTERVAL);
  }
}

module.exports = serial_list_update;
