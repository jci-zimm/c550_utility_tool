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

const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();
var u = require("./local_util");
const log = require("./log");

var a2l_modbus = {comm_port: "COM5", config_adr: 0x42};

const A2L_BAUD_RATE = 38400;
const A2L_POLL_RATE = 250; // ms
const A2L_SN_LEN = 6;
const  A2L_CLIENT_ADR_REG = 0,
  A2L_LFL_REG = 10,
  A2L_TEMP_REG = 13,
  A2L_RH_REG = 14,
  A2L_MITIGATION_THRESHOLD_REG  = 18,
  A2L_LEAK_DETECT_REG = 19,
  A2L_STATUS_REG = 20,
  A2L_FAULT_REG  = 21,
  A2L_SENSOR_LIFE_REG = 22,
  A2L_GAS_TYPE_REG = 23,
  A2L_SN_REG = 50;

let a2l_gas_types = [];
a2l_gas_types[4146] ="R32";
a2l_gas_types[5204] ="R454B";
a2l_gas_types[5212] ="R454C";
a2l_gas_types[5210] ="R454A";
a2l_gas_types[5205] ="R455A";

const a2l_addresses = [0x55,0x40,0x41,0x42,0x43,0x44,0x45];
const a2l_status = ["Unknown","Startup","Normal","Reserved","Fault"];

a2l_modbus.a2l_addresses = a2l_addresses;

function print_sensor_data(data)
{
  var off = A2L_LFL_REG;
  log.info(`LFL%: ${data[A2L_LFL_REG-off]/10}, Gas Type: ${a2l_gas_types[data[A2L_GAS_TYPE_REG-off]]}, Status: ${a2l_status[data[A2L_STATUS_REG-off]]}`);
  log.info(`Leak: ${data[A2L_LEAK_DETECT_REG-off]}, Age: ${data[A2L_SENSOR_LIFE_REG-off]}DAY, Fault: ${data[A2L_FAULT_REG-off]}`);
  log.info(`Temp: ${data[A2L_TEMP_REG-off]/100}C, RH: ${data[A2L_RH_REG-off]/10}%, MIT Thresh: ${data[A2L_MITIGATION_THRESHOLD_REG-off]/10}%`);
}

async function scan_for_sensors(client, scan_only)
{
  for(var adr of a2l_addresses)
  {
    await u.sleep(A2L_POLL_RATE);
    if(adr == a2l_modbus.config_adr && scan_only == false)
    {
      continue;
    }

    try{
      log.debug(`Scanning Address 0x${adr.toString(16)}`);
      client.setID(adr);
      var data = await client.readHoldingRegisters(A2L_SN_REG, A2L_SN_LEN);
      var serial_num = '';
      for(var word of data.data)
      {
        serial_num += String.fromCharCode(word & 0xFF);
        serial_num += String.fromCharCode((word>>8) & 0xFF);
      }

      if(scan_only)
      {
        log.pass(`Found A2L Sensor SN${serial_num} at 0x${adr.toString(16)}`);
        var sen_data = await client.readHoldingRegisters(A2L_LFL_REG, 14);
        print_sensor_data(sen_data.data);
      }
      else
      {
        log.info(`Found A2L Sensor ${serial_num} at 0x${adr.toString(16)}`);
      }

      if(scan_only == false)
      {
        var data = await client.writeRegister(A2L_CLIENT_ADR_REG, a2l_modbus.config_adr);
        log.pass(`SUCCESS, wrote A2L Sensor ${serial_num} from adr: 0x${adr.toString(16)} to 0x${a2l_modbus.config_adr.toString(16)}`);
      }

      if(a2l_modbus.exit_on_pass)
      {
        process.exit(0);
      }
    }catch(e)
    {
      //console.log(e);
    }
  }
}

async function start_server(scan_only)
{
  log.info(`Leak sensor monitor listening on port ${a2l_modbus.comm_port}`)
  if(scan_only)
  {
    log.info(`Scanning for leak sensors at addresses 0x40 - 0x45, and 0x55`)
  }
  else
  {
    log.info(`Plug in one A2L sensor for its address to be set to 0x${a2l_modbus.config_adr.toString(16)}`)
  }
  
  // open connection to a serial port
  client.connectRTUBuffered(a2l_modbus.comm_port, { baudRate: A2L_BAUD_RATE });
  client.setID(1);
  client.setTimeout(250);

  while(1)
  {
    await scan_for_sensors(client, scan_only);
    await u.sleep(1000);
  }
}
a2l_modbus.start_server = start_server;
a2l_modbus.exit_on_pass = false;

module.exports = a2l_modbus;
