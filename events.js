const fs = require('fs')

module.exports = {
    run: (client) => {
        const interactionHandlers = []
        fs.readdirSync('./Eventos/').forEach(local => {
            const eventFiles = fs.readdirSync(`./Eventos/${local}`).filter(arquivo => arquivo.endsWith('.js'))
            for (const file of eventFiles) {
                const event = require(`../Eventos/${local}/${file}`)
                if (event.name === 'interactionCreate') {
                    interactionHandlers.push(event)
                    continue
                }
                if (event.once) client.once(event.name, (...args) => event.run(...args, client))
                else client.on(event.name, (...args) => event.run(...args, client))
            }
        })
        if (interactionHandlers.length) {
            client.on('interactionCreate', async (...args) => {
                for (const event of interactionHandlers) {
                    try { await event.run(...args, client) }
                    catch (error) { console.error(`[Events] Falha em ${event.name}:`, error) }
                }
            })
        }
    }
}
