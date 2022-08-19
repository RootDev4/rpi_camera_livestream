const livestream = require('rpi_camera_livestream')
const express = require('express')
const app = express()
const port = 8080

livestream.setVerboseMode(true) // enable verbose mode
livestream.register(app, port)
livestream.setPathname('/webcam')
livestream.start().then(url => {
    // Do some fancy stuff here ...

    setTimeout(() => {
        const snapshot = livestream.getSnapshot()
        console.log(snapshot) // base64 encoded image string
    }, 1000) // We wait here a second to make sure, that at least one frame was captured
})

app.listen(port, () => console.log(`Webserver is up and listening on ${port}`))