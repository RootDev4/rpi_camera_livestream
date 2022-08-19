# Raspberry Pi Camera Livestream
Using NodeJS and Raspberry Pi camera module to provide a livestream for your website.
Inspired by caseymcj's [raspberrypi_node_camera_web_streamer](https://github.com/caseymcj/raspberrypi_node_camera_web_streamer).

## Compatibility Notice
This project is up-to-date and works with the latest Raspberry Pi OS 11 (Bullseye).

## Installation
First make sure the legacy camera support is enabled using `sudo raspi-config` and then select `3 Interface Options`.

### Install via npm
Create a new project with
```
npm init -y
```
and after that, install this package with
```
npm install rpi_camera_livestream
```

### Install via git
Clone this repository with
```
git clone https://github.com/RootDev4/rpi_camera_livestream.git
```
and install the dependencies with
```
npm install
```

## Quick start
The following snippet automatically starts an express webserver and continuously streams the captured video frames from the Raspberry Pi camera module via the default route /live.stream
### Server
```javascript
const livestream = require('rpi_camera_livestream')

livestream.start()
```

### Client
```html
<img src="http://<your_server_ipaddr>/live.stream">
```
or just open `http://<your_server_ipaddr>/live.stream` in your browser.

## Basic usage
```javascript
const livestream = require('rpi_camera_livestream')

livestream.setVerboseMode(true)     // enable verbose mode
livestream.setPort(3333)            // set webserver port
livestream.setPathname('/webcam')   // set route/pathname
livestream.start().then(url => console.log(`Livestream started on ${url}`))
// > Livestream started on http://<your_server_ipaddr>:3333/webcam
```
### Controls
```javascript
const livestream = require('rpi_camera_livestream')

livestream.start()  // Starts livestream and returns livestream URL
livestream.pause()  // Pauses a started livestream
livestream.resume() // Resumes a paused livestream
livestream.stop()   // Stops a started livestream
```
All controlling methods are promise-based and hence await'able and then'able
```javascript
const livestream = require('rpi_camera_livestream')

livestream.start().then(url => {
    console.log(`Livestream started on ${url}`)

    livestream.pause().then(() => {
        livestream.resume()
    })
})

await livestream.stop()
```
### Get last frame
Returns the last captured frame as buffered value.  If no images have been captured (which may be the case if no users have connected yet), this value is `null`.
```javascript
livestream.getLastFrame()
```
### Take snapshot
Takes a snapshot by using the last captured frame if it is not `null` and returns it as a base64 encoded image string based on the encoding type you set.
```javascript
livestream.getSnapshot()
```
### Get supported encoding types
Returns a comma-separated string list containing the supported encoding types.
```javascript
livestream.getSupportedEncodingList()
```
## Documentation
### Verbose mode
Enable/Disable verbose mode. Default: disabled
```javascript
livestream.setVerboseMode(true)
```

### Register a running express webserver
Register an express webserver, if you want to use your already running webserver
```javascript
const livestream = require('rpi_camera_livestream')
const express = require('express')
const app = express()
const port = 8080

livestream.register(app, port)
livestream.start()

app.listen(port, () => console.log(`Webserver listening on port ${port}`))
```
### Set webserver port
Default: 8000
```javascript
livestream.setPort(3333)
```
### Set route/pathname
Default: /live.stream
```javascript
livestream.setPathname('/webcam')
```
### Set video width
Default: 1280px
```javascript
livestream.setWidth(800)
```
Minimum width is 32px. Maximum width depends on your camera version (v1: 2592px, v2: 3280px). Specify your camera version if necessary (default: v2)
```javascript
livestream.setWidth(800, 1) // v1 camera
```
### Set video height
Default: 720px
```javascript
livestream.setHeight(600)
```
Minimum height is 16px. Maximum height depends on your camera version (v1: 1944px, v2: 2464px). Specify your camera version if necessary (default: v2)
```javascript
livestream.setHeight(600, 1) // v1 camera
```
### Set FPS
Default: 16
```javascript
livestream.setWidth(25) // min: 1, max: 90
```
### Set encoding type
Default: JPEG (hardware accelerated)
```javascript
livestream.setEncoding('PNG')
```
Valid encoding types are: JPEG, GIF, PNG, PPM, TGA, BMP
### Set quality
Default: 25
```javascript
livestream.setEncoding(15) // min: 1, max: 100
```
Lower values lead to a faster stream.