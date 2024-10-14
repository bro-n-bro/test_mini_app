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
        #userId = '808958531'
        #peer = new Peer()
        #conn = null
        #chainId = ''
        #jwAddress = ''
        #pubKey = ''
        #isConnected = false
        #connectionInterval = 200


        // Constructor for JetPack class
        constructor() {
            // Get telegram user ID from telegram mini app init data
			if (window.Telegram && window.Telegram.WebApp) {
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
                        peer: this.#peer.id,
                        chain_id: this.#chainId
                    }
                })

                // Construct Telegram bot URL
                const telegramUrl = `https://t.me/${BOT_USERNAME}/dev_JetWallet?startapp=${encodedData}`

                // Try to open the URL
                try {
                    // Open the URL
                    this._openUrl(telegramUrl)

                    // Create connection to jetWallet
                    const intervalId = setInterval(() => {
                        this.#conn = this.#peer.connect(`jw-${BOT_ID}-${this.#userId}`)

                        // Successful connection
                        this.#conn.on('open', () => {
                            // Stop the interval
                            clearInterval(intervalId)

                            // Set connected status to true
                            this.#isConnected = true

                            // Resolve promise when connected
                            resolve(true)
                        })

                        // Processing data receipt
                        this.#conn.on('data', data => {
                            try {
                                // Parse incoming data as JSON
                                const parsedData = JSON.parse(data)

                                // Check the type of received data
                                if (parsedData.type === 'address') {
                                    // Save data
                                    this.#jwAddress = parsedData.address
                                    this.#pubKey = parsedData.pubKey

                                    // Resolve the promise with true
                                    resolve(true)
                                } else if (parsedData.type === 'error') {
                                    // If the data is an error, handle it
                                    console.error('Error received:', parsedData.message)

                                    // Reject promise
                                    reject(new Error(parsedData.message))
                                } else {
                                    console.warn('Unknown data type received:', parsedData)
                                }
                            } catch (error) {
                                console.error('Failed to parse incoming data:', error)

                                // Reject promise if there's an error in parsing or data
                                reject(error)
                            }
                        })

                        // Error handling
                        this.#conn.on('error', err => {
                            // Stop the interval
                            clearInterval(intervalId)

                            // Reject promise on error
                            reject(err)
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
                    console.error('Failed to open URL:', error)

                    // Reject promise if URL opening fails
                    reject(error)
                }
            })
        }


        // Public method to connection status
        async isConnected() {
            return this.#isConnected
        }


        // Public method to get address
        async getAddress() {
            return this.#jwAddress
        }


        // Public method to get pubKey
        async getPubKey() {
            return this.#pubKey
        }
    }

    // Return the JetPack class
    return JetPack
})))