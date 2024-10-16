// Universal Module Definition (UMD) wrapper
(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.JetPack = factory())
}(this, (function () {
    'use strict'


    // Internal constant for bot username
    const BOT_USERNAME = 'cosmos_wallet_bot',
        // BOT_TOKEN = '7437812149:AAFOqawApsG8osd-fo0kbI7_G6ic4gi3MFI',
        BOT_ID = '7437812149'


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
        // #userId = ''
        #userId = '808958531'
        #peer = null
        #peerID = null
        #conn = null
        #chainId = ''
        #jwAddress = ''
        #pubKey = ''
        #isConnected = false
        #connectionInterval = 500


        // Constructor for JetPack class
        constructor() {

        }


        // Initialization
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

                    document.getElementById('ddd').innerText = this.#userId
				}
			}
        }


        // Private method to open URL
        _openUrl(url) {
            // If window is available (browser environment), use window.open
            if (typeof window !== 'undefined' && window.open) {
                window.open(url, '_blank')

                return
            }

            // If window.open is not available, throw an error
            throw new Error('Unable to open URL. This method may only work in a browser environment.')
        }


        // Generate a random ID
        _generateRandomId() {
            return `${this.#userId}-${Math.random().toString(36).substring(2, 15)}`
        }


        // Public method to connect wallet
        async connectWallet(chain_id = 'cosmoshub') {
            return new Promise((resolve, reject) => {
                // Check if already connected
                if (this.#isConnected) {
                    console.warn('Already connected. Cannot initiate a new connection.')

                    // Return false to indicate that no new connection was made
                    return resolve(false)
                }

                // Save chain id
                this.#chainId = chain_id

                // Encode data to Base64
                const encodedData = encodeToBase64({
                    method: 'connectWallet',
                    data: {
                        peer_id: this.#peerID,
                        chain_id: this.#chainId
                    }
                })

                // Construct Telegram bot URL
                const telegramUrl = `https://t.me/${BOT_USERNAME}/dev_JetWallet?startapp=${encodedData}`
                // const telegramUrl = `http://localhost:8080/auth?tgWebAppStartParam=${encodedData}`

                // Try to open the URL
                try {
                    // Open the URL
                    this._openUrl(telegramUrl)

                    // Create connection to jetWallet
                    const intervalId = setInterval(() => {
                        // Save connection
                        this.#conn = this.#peer.connect(`jw-${BOT_ID}-${this.#userId}`)

                        // Successful connection
                        this.#conn.on('open', () => {
                            // Stop the interval
                            clearInterval(intervalId)

                            // Set connected status to true
                            this.#isConnected = true
                        })

                        // Processing data receipt
                        this.#conn.on('data', data => {
                            // Check the type of received data
                            if (data.type === 'address') {
                                // Save data
                                this.#jwAddress = data.address

                                // Resolve the promise with true
                                resolve(true)
                            } else if (data.type === 'error') {
                                // Reject promise
                                reject(`Error received: ${data.message}`)
                            } else {
                                // Reject promise
                                reject('Unknown data type received.')
                            }
                        })

                        // Error handling
                        this.#conn.on('error', error => {
                            // Stop the interval
                            clearInterval(intervalId)

                            // Reject promise on error
                            reject(error)
                        })

                        // Handle disconnection event
                        this.#conn.on('close', () => {
                            console.warn('Connection closed.')

                            // Set the connection status to false
                            this.#isConnected = false
                        })

                        this.#conn.on('disconnected', () => {
                            console.warn('Connection lost.')

                            // Set the connection status to false
                            this.#isConnected = false
                        })
                    }, this.#connectionInterval)
                } catch (error) {
                    // Reject promise if URL opening fails
                    reject('Failed to open URL.')
                }
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