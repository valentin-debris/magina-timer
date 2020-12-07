import Store from "electron-store";

const config = new Store({
    defaults: {
        windowBounds: { x: 0, y: 0, width: 800, height: 600 },
        version: "",
        dbName: "",
        today: "",
        lastCalls: {
            clients: 0,
            projects: 0,
            tasks: 0,
            times: 0,
        },
        defaultListingLastDays: 14,
        personalOnly: false,
        preferences: {
            files: {
                fullName: "John Doe",
                salary: "1234",
                hours: "155.55",
            },
            filter: "",
            notifAway: true,
            notifAwayDelay: 5,
            notifStart: true,
            minimize: true,
        },
    },
    migrations: {
        "2.0.0": (store) => {
            store.set("preferences.notifAway", true);
            store.set("preferences.notifAwayDelay", 5);
            store.set("preferences.notifStart", true);
            store.set("preferences.minimize", true);
            store.set("preferences.minimize", true);
            store.set("personalOnly", false);
        },
    },
});

export default config;
