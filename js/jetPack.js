// Universal Module Definition (UMD) wrapper
(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.JetPack = factory())
}(this, (function () {
    'use strict'


    // Internal constant for bot username
    const BOT_USERNAME = 'cosmos_wallet_bot',
        BOT_ID = 7437812149,
        APP_NAME = 'dev_JetWallet'


    // Utility function to encode JSON object to Base64
    const encodeToBase64 = (obj) => {
        // Convert object to JSON string
        const jsonString = JSON.stringify(obj)

        // Encode JSON string to Base64
        return btoa(jsonString)
    }


    // Main JetPack class definition
    class JetPack {
        // Private params
        #userId = null
        // #userId = 808958531
        #peer = null
        #peerID = null
        #conn = null
        #chainId = ''
        #jwAddress = ''
        #pubKey = ''
        #isConnected = false
        #connectionInterval = 500
        #callbacks = {}
        #eventListeners = {}


        // Constructor for JetPack class
        constructor(autoConnect) {
            // Init
            this.init().then(() => {
                if (autoConnect) {
                    // Auto connection
                    this._connection()
                }
            })

            // Destroy Peer on close
            window.addEventListener('beforeunload', () => {
                // Close Peer
                this.#conn.close()

                // Destroy Peer
                this.#peer.destroy()
            })
        }


        // Subscribe to events
        on(event, callback) {
            // Check event
            if (!this.#eventListeners[event]) {
                this.#eventListeners[event] = []
            }

            // Save callback
            this.#eventListeners[event].push(callback)
        }


        // Event call
        _emit(event, data) {
            const listeners = this.#eventListeners[event]

            if (listeners) {
                listeners.forEach(callback => callback(data))
            }
        }


        // Private method to open URL
        _openUrl(url) {
            // If window is available (browser environment), use window.open
            if (typeof window !== 'undefined' && window.open) {
                window.open(url)

                return
            }

            // If window.open is not available, throw an error
            throw new Error('Unable to open URL. This method may only work in a browser environment.')
        }


        // Generate a random ID
        _generateRandomId() {
            return `${this.#userId}-${Math.random().toString(36).substring(2, 15)}`
        }


        // Handle data
        _handleData(data) {
            // Check the type of received data
            if (data.type === 'address') {
                // Save data
                this.#jwAddress = data.address

                // Emit an event for address reception
                this._emit('addressReceived', data.address)
            } else if (data.type === 'tx') {
                // Emit an event for transaction reception
                this._emit('txReceived', data.hash)
            } else if (data.type === 'error') {
                // Emit an event for an error
                this._emit('error', data.message)
            } else {
                // Emit an event for an error
                this._emit('error', 'Unknown data type received.')
            }

            // Check if there is a requestId and if there is a callback for it
            if (data.requestId && this.#callbacks[data.requestId]) {
                // Execute callback
                this.#callbacks[data.requestId](data)

                // Remove callback after execution
                delete this.#callbacks[data.requestId]
            }
        }


        // Open wallet
        _openWallet(chain_id, request_id, resolve, reject) {
            // Save chain id
            this.#chainId = chain_id

            // Encode data to Base64
            const encodedData = encodeToBase64({
                method: 'connectWallet',
                data: {
                    peer_id: this.#peerID,
                    chain_id: this.#chainId,
                    request_id
                }
            })

            // Try to open the URL
            try {
                // Open the URL
                this._openUrl(`https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=${encodedData}`)
                // this._openUrl(`http://localhost:8080/auth?tgWebAppStartParam=${encodedData}`)

                // Connection
                this._connection()
            } catch (error) {
                // Reject promise
                reject('Failed to open URL.')
            }
        }


        // Connection
        _connection() {
            // Create connection to jetWallet
            const intervalId = setInterval(() => {
                // Save connection
                this.#conn = this.#peer.connect(`jw-${BOT_ID}-${this.#userId}`)

                if (this.#conn) {
                    // Successful connection
                    this.#conn.on('open', () => {
                        // Stop the interval
                        clearInterval(intervalId)

                        // Set connected status to true
                        this.#isConnected = true

                        // Call the 'connect' event
                        this._emit('connect')
                    })

                    // Processing data receipt
                    this.#conn.on('data', data => this._handleData(data))

                    // Error handling
                    this.#conn.on('error', () => {
                        // Stop the interval
                        clearInterval(intervalId)
                    })

                    // Handle disconnection event
                    this.#conn.on('close', () => {
                        // Set the connection status to false
                        this.#isConnected = false

                        // Call the 'disconnect' event
                        this._emit('disconnect')
                    })

                    this.#conn.on('disconnected', () => {
                        // Set the connection status to false
                        this.#isConnected = false

                        // Call the 'disconnect' event
                        this._emit('disconnect')
                    })
                }
            }, this.#connectionInterval)
        }


        // Init
        async init() {
            // Generate a random ID
            this.#peerID = this._generateRandomId()

            // Init Peer
            this.#peer = new Peer(this.#peerID)

            // Get telegram user ID from telegram mini app init data
            if (window.Telegram && window.Telegram.WebApp) {
                // Initialize the mini-application
                await Telegram.WebApp.ready()

                // Decode data
                let decodedString = decodeURIComponent(Telegram.WebApp.initData)

                // Get user params
                let userParams = JSON.parse(new URLSearchParams(decodedString).get('user'))

                // Set data
                if (userParams) {
                    this.#userId = userParams.id
                }
            }
        }


        // Public method to connect wallet
        connectWallet(chain_id = 'cosmoshub') {
            return new Promise((resolve, reject) => {
                // Generate a random ID
                const requestId = this._generateRandomId()

                // Save callback
                this.#callbacks[requestId] = response => {
                    response.type === 'error'
                        ? reject(response.message)
                        : resolve(response)
                }

                // Check if already connected
                if (!this.#isConnected) {
                    // First connection
                    this._openWallet(chain_id, requestId, resolve, reject)
                } else {
                    // Send message
                    this.#conn.send({
                        method: 'connectWallet',
                        data: {
                            peer_id: this.#peerID,
                            chain_id: this.#chainId,
                            request_id: requestId
                        }
                    })

                    Telegram.WebApp.showAlert('Return to the JetWallet.')
                }
            })
        }


        // Public method to send Tx
        sendTx(messages) {
            return new Promise((resolve, reject) => {
                if (!this.#isConnected || !this.#conn) {
                    return reject('No connection established.')
                }

                // Generate a random ID
                const requestId = this._generateRandomId()

                // Save callback
                this.#callbacks[requestId] = response => {
                    response.type === 'error'
                        ? reject(response.message)
                        : resolve(response)
                }

                // Send message
                this.#conn.send({
                    method: 'sendTx',
                    data: {
                        peer_id: this.#peerID,
                        chain_id: this.#chainId,
                        request_id: requestId,
                        msg: messages
                    }
                })

                Telegram.WebApp.showAlert('Return to the JetWallet.')
            })
        }


        // Public method to connection status
        isConnected() {
            return this.#isConnected
        }


        // Public method to get address
        getAddress() {
            return this.#jwAddress
        }


        // Public method to get pubKey
        getPubKey() {
            return this.#pubKey
        }
    }

    // Return the JetPack class
    return JetPack
})))