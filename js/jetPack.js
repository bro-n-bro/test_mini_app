// Universal Module Definition (UMD) wrapper
(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.JetPack = factory())
}(this, (function () {
    'use strict'


    // Internal constant for bot username
    const BOT_USERNAME = 'cosmos_wallet_bot'


    // Utility function to encode JSON object to Base64
    const encodeToBase64 = (obj) => {
        // Convert object to JSON string
        const jsonString = JSON.stringify(obj)

        // Encode JSON string to Base64
        return btoa(jsonString)
    }


    // Main JetPack class definition
    class JetPack {
        // Constructor for JetPack class
        constructor() {

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


        // Public method to get address
        getAddress() {
            // Encode data to Base64
            const encodedData = encodeToBase64({
                method: 'getAddress',
                data: null
            })

            // Construct Telegram bot URL
            const telegramUrl = `https://t.me/${BOT_USERNAME}/dev_JetWallet?startapp=${encodedData}`

            // Try to open the URL
            try {
                this._openUrl(telegramUrl)
            } catch (error) {
                console.error('Failed to open URL:', error)
            }
        }
    }

    // Return the JetPack class
    return JetPack
})))