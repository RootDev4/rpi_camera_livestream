class LiveStream {

    /**
     * List with supported encoding types
     * JPEG is hardware accelerated
     */
    static supportedEncodingTypes = ['JPEG', 'GIF', 'PNG', 'PPM', 'TGA', 'BMP']

    /**
     * Using NodeJS and Raspberry Pi camera module to provide a livestream for your website
     * @param {*} config Livestream configuration as JSON object
     */
    constructor(config = { width: 1280, height: 720, fps: 16, encoding: 'JPEG', quality: 25 }) {
        this.camera = null
        this.server = { app: null, port: 8000 }
        this.config = config
        this.mimeType = null
        this.pathname = '/live.stream'
        this.lastFrame = null
        this.verboseMode = false
        this.streamStatus = { started: false, paused: false, stopped: false }
    }

    /**
     * Register this class to an existing express object
     * @param {*} app Express object
     * @param {*} port Port value as integer
     */
    register(app, port = null) {
        this.server.app = app
        this.server.port = (port) ? parseInt(port) : this.server.port
    }

    /**
     * Set a new port value and override default value
     * @param {*} port Port value as integer
     */
    setPort(port) {
        if (parseInt(port) <= 1023) console.log(`[!] WARNING: using well-known ports (0-1023) may cause problems.`)
        this.server.port = parseInt(port)
    }

    /**
     * Set a new pathname and override default value
     * @param {*} src Pathname as string
     */
    setPathname(src) {
        this.pathname = (src.startsWith('/')) ? src.trim() : `/${src.trim()}`
    }

    /**
     * Set verbose mode on/off
     * @param {*} mode true/false means on/off
     */
    setVerboseMode(mode) {
        this.verboseMode = Boolean(mode)
    }

    /**
     * Set a new width value and override default value
     * @param {*} width Width value as integer
     * @param {*} v Version of camera module as integer
     */
    setWidth(width, v = 2) {
        const widthVal = parseInt(width)
        const maxWidth = (v === 1) ? 2592 : 3280
        if (widthVal < 32 || widthVal > maxWidth) throw new Error(`[-] Maximum width must between 32 and ${maxWidth} for v${v} cameras.`)
        this.config.width = widthVal
    }

    /**
     * Set a new height value and override default value
     * @param {*} height Height value as integer
     * @param {*} v Version of camera module as integer
     */
    setHeight(height, v = 2) {
        const heightVal = parseInt(height)
        const maxHeight = (v === 1) ? 1944 : 2464
        if (heightVal < 16 || heightVal > maxHeight) throw new Error(`[-] Maximum height must between 16 and ${maxHeight} for v${v} cameras.`)
        this.config.height = heightVal
    }

    /**
     * Set a new FPS value and override default value
     * @param {*} fps FPS value as integer
     */
    setFPS(fps) {
        const fpsVal = parseInt(fps)
        if (fpsVal < 1 || fpsVal > 90) throw new Error('[-] FPS value must between 1 and 90.')
        this.config.fps = fpsVal
    }

    /**
     * Set a new encoding type and override default value
     * @param {*} encoding Encoding type value as string
     */
    setEncoding(encoding) {
        const encVal = encoding.trim().toUpperCase()
        if (!supportedEncodingTypes.includes(encVal)) throw new Error(`[-] Encoding type '${encVal}' is not supported.`)
        this.config.encoding = encVal
        this.mimeType = `image/${encVal.toLowerCase()}`
    }

    /**
     * Set a new quality value and override default value
     * @param {*} quality Quality value as integer
     */
    setQuality(quality) {
        const qltyVal = parseInt(quality)
        if (qltyVal < 1 || qltyVal > 100) throw new Error('[-] Quality value must between 1 and 100.')
        this.config.quality = qltyVal
    }

    /**
     * Return last captured frame
     * @returns Last captured frame as buffer
     */
    getLastFrame() {
        if (!this.streamStatus.started) throw new Error('[-] Last frame cannot be captured because the livestream has not started yet')
        return this.lastFrame
    }

    /**
     * Take a snapshot by using the last captured frame
     * @returns Base64 encoded image string or null
     */
    getSnapshot() {
        return new Promise((resolve, reject) => {
            if (this.lastFrame) {
                resolve(`data:${this.mimeType};base64,${Buffer.from(this.lastFrame).toString('base64')}`)
            } else {
                resolve(null)
            }
        })
    }

    /**
     * Return a stringyfied representation of supported encoding types list
     * @returns Comma-separated list string
     */
    getSupportedEncodingTypes() {
        return LiveStream.supportedEncodingTypes.join(',')
    }

    /**
     * Initializing Raspberry Pi camera module and webserver
     * @private
     * @returns Promise
     */
    #initialize() {
        return new Promise((resolve, reject) => {
            try {
                this.camera = require('@zebrajaeger/raspberry-pi-camera-native')

                if (!this.server.app) {
                    const express = require('express')
                    this.server.app = express()
                    this.server.app.listen(this.server.port, () => {
                        if (this.verboseMode) console.log(`[+] Webserver is up and listening on port ${this.server.port}`)
                        resolve()
                    })
                } else {
                    if (this.verboseMode) console.log(`[+] Streaming over registered webserver on port ${this.server.port}`)
                    resolve()
                }
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Creating route with set pathname and send frames
     * @private
     * @returns Promise
     */
    #listen() {
        return new Promise((resolve, reject) => {
            try {
                this.server.app.get(this.pathname, (req, res) => {
                    res.writeHead(200, {
                        'Cache-Control': 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
                        'Pragma': 'no-cache',
                        'Connection': 'close',
                        'Content-Type': 'multipart/x-mixed-replace; boundary=--livestream'
                    })

                    const frameHandler = frameData => {
                        try {
                            this.lastFrame = frameData
                            res.write(`--livestream\nContent-Type: ${this.mimeType}\nContent-length: ${frameData.length}\n\n`)
                            res.write(frameData)
                        } catch (error) {
                            if (this.verboseMode) console.log('Sending a single frame failed with error:', error)
                            return false
                        }

                        return true
                    }

                    const frameEmitter = this.camera.on('frame', frameHandler)
                    req.on('close', () => {
                        if (this.verboseMode) console.log('[+] Client closed the connection to host')
                        frameEmitter.removeListener('frame', frameHandler)
                    })

                    resolve(req.hostname)
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Start Raspberry Pi camera livestream
     * @returns Resolved promise after camera started
     */
    start() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.streamStatus.stopped) throw new Error('[-] The stream cannot be started after it has been stopped')

                await this.#initialize()

                this.camera.start(this.config, () => {
                    this.streamStatus.started = true

                    this.#listen().then(ip => {
                        if (this.verboseMode) console.log(`[+] Livestream started on http://${ip}:${this.server.port}${this.pathname}`)
                        if (this.verboseMode) console.log(`[+] Client connected to host ${ip}`)
                        
                        resolve(`http://${ip}:${this.server.port}${this.pathname}`)
                    })
                })
            } catch (error) {
                if (this.verboseMode) console.log(`[-] Starting livestream feed failed with error:`, error)
                reject(error)
            }
        })
    }

    /**
     * Pause Raspberry Pi camera livestream
     * @returns Resolved promise after camera paused
     */
    pause() {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.streamStatus.started) throw new Error('[-] The stream cannot be paused because it has not been started yet')

                this.camera.pause(() => {
                    this.streamStatus.paused = true
                    if (this.verboseMode) console.log('[+] Livestream paused')
                    resolve()
                })
            } catch (error) {
                if (this.verboseMode) console.log(`[-] Starting livestream feed failed with error:`, error)
                reject(error)
            }
        })
    }

    /**
     * Resume Raspberry Pi camera livestream
     * @returns Resolved promise after camera resumed
     */
    resume() {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.streamStatus.paused) throw new Error('[-] The stream cannot be resumed because it has not been paused')

                this.camera.resume(() => {
                    this.streamStatus.paused = false
                    if (this.verboseMode) console.log('[+] Livestream resumed')
                    resolve()
                })
            } catch (error) {
                if (this.verboseMode) console.log(`[-] Starting livestream feed failed with error:`, error)
                reject(error)
            }
        })
    }

    /**
     * Stop Raspberry Pi camera livestream
     * @returns Resolved promise after camera stopped
     */
    stop() {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.streamStatus.started) throw new Error('[-] The stream cannot be stopped because it has not been started yet')

                this.camera.stop(() => {
                    this.streamStatus.stopped = true
                    this.streamStatus.started = false
                    this.camera = null
                    if (this.verboseMode) console.log('[+] Livestream stopped')
                    resolve()
                })
            } catch (error) {
                if (this.verboseMode) console.log(`[-] Starting livestream feed failed with error:`, error)
                reject(error)
            }
        })
    }

}

module.exports = LiveStream