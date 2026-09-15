const fs = require('fs');
const path = require('path');
const { recordError, runLimited } = require('../Lib/Resilience');

module.exports = {
    run: (client) => {
        const handlers = new Map();
        fs.readdirSync(path.join(__dirname, '../Eventos/')).forEach(local => {
            const dir = path.join(__dirname, '../Eventos/', local);
            if (!fs.statSync(dir).isDirectory()) return;
            fs.readdirSync(dir).filter(file => file.endsWith('.js')).forEach(file => {
                const event = require(path.join(dir, file));
                if (!event?.name || typeof event.run !== 'function') return;
                if (!handlers.has(event.name)) handlers.set(event.name, []);
                handlers.get(event.name).push(event);
            });
        });
        for (const [name, events] of handlers) {
            const dispatch = async (...args) => {
                for (const event of events) {
                    try {
                        await runLimited(() => event.run(...args, client), `discord:${name}`, 4);
                    } catch (error) {
                        recordError(error, { type: 'eventHandler', event: name, handler: event.name });
                    }
                }
            };
            if (events.some(event => event.once)) client.once(name, dispatch);
            else client.on(name, dispatch);
        }
    }
};
