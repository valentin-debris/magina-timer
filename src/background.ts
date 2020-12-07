"use strict";

import * as Sentry from "@sentry/electron";

import {
    BrowserWindow,
    Menu,
    Tray,
    app,
    ipcMain,
    protocol,
    shell,
} from "electron";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";

import AutoUpdate from "@/plugins/checkUpdate";
import Config from "@/plugins/electronStore";
import EventBus from "@/plugins/eventBus";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

// @ts-ignore
const iconPath = path.join(__static, "icon.png");

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true } },
]);

let mainWindow: BrowserWindow;
let popupIdleWindow: BrowserWindow | null;
let prefWindow: BrowserWindow | null;
let exportWindow: BrowserWindow | null;

let appIcon;

function createSubWindow(nameFile: string, onTop = false, w = 350, h = 500) {
    // Create the browser window.
    let window = new BrowserWindow({
        width: w,
        height: h,
        center: true,
        icon: iconPath,
        alwaysOnTop: onTop,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: (process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
        },
    });
    window.setMenu(null);

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        window.loadURL(process.env.WEBPACK_DEV_SERVER_URL + nameFile);
        if (!process.env.IS_TEST) window.webContents.openDevTools();
    } else {
        // Load the index.html when not in development
        window.loadURL(`app://./${nameFile}.html`);
    }

    window.on("closed", () => {
        // @ts-ignore
        window = null;
    });
    return window;
}

async function createMainWindow() {
    // Create the browser window.
    const { x, y, width, height } = Config.get("windowBounds");
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: x,
        y: y,
        webPreferences: {
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            webSecurity: false,
            nodeIntegration: (process.env
                .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
        },
    });

    mainWindow.on("resize", () => {
        const { x, y, width, height } = mainWindow.getBounds();
        Config.set("windowBounds", { x, y, width, height });
    });

    mainWindow.on("minimize", function(event: any) {
        const allowMinimize = Config.get("preferences.minimize");
        // @ts-ignore
        if (allowMinimize && !app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on("close", async function(event) {
        const allowMinimize = Config.get("preferences.minimize");
        // @ts-ignore
        if (allowMinimize && !app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }

        return false;
    });

    ipcMain.handle("openPopupIdle", () => {
        if (!popupIdleWindow) {
            popupIdleWindow = createSubWindow("popupIdle", true, 400, 300);
        }
    });

    ipcMain.handle("closeWindow", (e, typeWindow: string) => {
        if (typeWindow == 'popupIdle' && popupIdleWindow) {
            popupIdleWindow.close();
            popupIdleWindow = null;
        } else if (typeWindow == 'preferences' && prefWindow) {
            prefWindow.close();
            prefWindow = null;
        } else if (typeWindow == 'timeExport' && exportWindow) {
            exportWindow.close();
            exportWindow = null;
        }
    });

    //Setup the menu
    const appMenu = Menu.buildFromTemplate([
        {
            label: "Menu",
            submenu: [
                {
                    label: "Préférences",
                    click: function() {
                        prefWindow = createSubWindow("preferences");
                    },
                },
                {
                    label: "Se déconnecter",
                    click: function() {
                        mainWindow.webContents.send("logout");
                    },
                },
                {
                    label: "Quitter",
                    click: function() {
                        // @ts-ignore
                        app.isQuiting = true;
                        app.quit();
                    },
                },
            ],
        },
        {
            label: "Options",
            submenu: [
                {
                    label: "Export",
                    click: function() {
                        exportWindow = createSubWindow("timeExport");
                    },
                },
            ],
        },
        {
            label: "Synchroniser",
            submenu: [
                {
                    label: "Synchroniser",
                    click: function() {
                        mainWindow.webContents.send("synchronize");
                    },
                },
            ],
        },
        {
            label: "Aide",
            submenu: [
                {
                    label: "Docs",
                    click: function() {
                        popupIdleWindow = createSubWindow("popupIdle", true, 400, 300);
                        // shell.openExternal(
                        //     "https://developers.magina.fr/documentation/magina-timer/"
                        // );
                    },
                },
                {
                    label: "Slack",
                    click: function() {
                        shell.openExternal(
                            "slack://channel?team=TBRMMJZC3&id=C010PKT2BNX"
                        );
                    },
                },
                {
                    label: "v" + app.getVersion() + (isDev ? "-dev" : ""),
                    click: function() {
                        mainWindow.webContents.openDevTools();
                    },
                },
            ],
        },
    ]);
    Menu.setApplicationMenu(appMenu);

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
        if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
    } else {
        createProtocol("app");
        // Load the index.html when not in development
        mainWindow.loadURL("app://./index.html");
    }
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.whenReady().then(async () => {
    if (isDev && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS_DEVTOOLS);
        } catch (e) {
            console.error("Vue Devtools failed to install:", e.toString());
        }
    }

    Sentry.init({
        dsn: process.env.VUE_APP_CRASH_HOST,
    });

    await AutoUpdate();

    Config.set("version", app.getVersion());

    appIcon = new Tray(iconPath);
    appIcon.setToolTip("Magina Timer");
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Ouvrir",
            click: function() {
                mainWindow.show();
            },
        },
        {
            label: "Quitter",
            click: function() {
                // @ts-ignore
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);

    // Fait un changement au menu contextuel
    contextMenu.items[1].checked = false;

    // Appelé à nouveau pour Linux car nous avons modifié le menu contextuel
    appIcon.setContextMenu(contextMenu);
    appIcon.on("double-click", function() {
        mainWindow.show();
    });

    createMainWindow();

    app.on("activate", () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

// Exit cleanly on request from parent process in development mode.
if (isDev) {
    if (process.platform === "win32") {
        process.on("message", (data) => {
            if (data === "graceful-exit") {
                app.quit();
            }
        });
    } else {
        process.on("SIGTERM", () => {
            app.quit();
        });
    }
}
