
# c550_utility_tool

## Introduction

This document overviews the **c550_utility_tool.exe** which allows for bulk loading of C550 configurations and leak sensor addressing. The recommended bulk workflow is as follows: 

<img src="assets\process.svg"><br>

- [Optional if using multiple leak sensors] Address and label all leak sensors ahead of time using this tool
- While unpowered, wire the entire C550 system with I/O and pre-addressed leak sensors
- Power on system and use tool to load configuration
- Validate that there are no alarms/warnings with the system and that the configured apps are present

To support the various modes of operation, the tool supports the following command line arguments:

| Argument | Values | Description | 
| ---- | ---- | ---- | 
| **-mode** | "a2l" or "config" | Optional arg to change the tool mode. C550 "config" mode is default. 
| **-file** | ./path-to-config.txt | Optional arg to specify a C550 config file path other than default.
| **-adr** | 0x40 to 0x45 | Optional arg in "a2l" mode to set any sensor's address | 
| **-port** | COMX | Required arg in "a2l" mode to specify the RS485<-->USB COM port such as "COM5" |
| **-run_once** | 0(default) or 1 | When 1, in "a2l" or "config" mode, the program exits upon first success. When 0, the program will operate continuously.

## C550 Configuration Mode

By default, when c550_utility_tool.exe is launched, it loads **c550_config_default.txt** into any C550 that is plugged in via USB. To alter the configuration to be loaded, either modify the default text file or pass in a file path argument to the executable such as:

```
c550_utility_tool.exe -file my_config.txt
```

The following is an example of the executable output in this mode:

<img src="assets\cut_example.png">

## Leak Sensor, Addressing Mode

The c550_utility_tool.exe can address leak detect sensors to specific modbus addresses (0x40 through 0x45 and 0x55). By default, sensors are shipped with an address of 0x55 and the C550 automatically assigns any new sensor to the next available address starting at 0x40. This requires each sensor to be sequentially added to the C550 system while powering existing leak sensors. Alternatively, this tool can be used to bulk address sensors ahead of time such that they can all be wired in at once without address conflicts.

The following is an example command line usage: 

```
c550_utility_tool.exe -mode a2l -port COM5 -adr 0x40
```

In this example, the RS485 comm port is COM5, and any plugged in leak detect sensor will have its address changed to 0x40. Note, only 1 sensor should be plugged into the wiring harness at a time. An example of the CLI output in this case is shown below: 

```
[I][2024-11-04T22:56:37.747Z] A2L Address setter listening on port COM5
[I][2024-11-04T22:56:37.748Z] Plug in one A2L sensor for its address to be set to 0x43
[I][2024-11-04T22:56:39.617Z] Found A2L Sensor 090000000609 at 0x42
[P][2024-11-04T22:56:39.647Z] SUCCESS, wrote A2L Sensor 090000000609 from adr: 0x42 to 0x43
```

The hardware required for this mode is a USB to RS485 adapter, a C550 power module, and a wire harness to connect all the components together. The following diagram illustrates the wiring: 

<img src="assets\tool_wiring.png">

## Leak Sensor, Scan Mode

The c550_utility_tool.exe can scan for leak detect sensors and provide information on them. By not providing the **-adr** argument, the tool will scan all available addresses for sensors and provide information on the sensor. The following is an example: 

```
[P][2024-11-14T18:57:01.165Z] Found A2L Sensor 090000000609 at 0x40
[I][2024-11-14T18:57:01.195Z] LFL%: 0, Gas Type: R455A, Status: Normal
[I][2024-11-14T18:57:01.196Z] Leak: 0, Age: 16DAY, Fault: 0
[I][2024-11-14T18:57:01.196Z] Temp: 27.06C, RH: 51.9%, MIT Thresh: 20%
```

## Appendix Windows USB COM Port Number Re-use

Windows by default creates a new serial port number per device eventually causing issues with large device counts. Windows can be configured to reuse port numbers of a particular device by a adding a regedit entry. This is useful for C550 configuration loading to ensure a PC operating the tool does not run out of serial comm ports. Instructions:

1.	Open up regedit
2.	Navigate to HKEY_LOCAL_MACHINE\SYSTEM\CurrentConstrolSet\Control\usbflags
3.	Create a “Binary Value” called IgnoreHWSerNum303A1001 . Assign it the value 1 and close regedit. 

<img src="assets\regedit.png">

# Operation

This section covers implementation/function of the tool

## Build Instructions

Sources are provided as is for reference 

1. Download nodejs
2. Run `npm install` in this directory
3. Run `node index.js` to run the program. 
4. See [instructions.md](#introduction) for list of CLI parameters
5. Run `npm run build-exe` to build the executable