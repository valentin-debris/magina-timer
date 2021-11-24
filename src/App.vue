<template>
    <v-app>
        <v-app-bar app color="primary" dark>
            <Header />
        </v-app-bar>

        <v-main>
            <Login />
            <HomePage />
            <Panel />
            <Filters />
            <Notifications />

            <v-snackbar v-model="snackbar" :timeout="durationSk">
                {{ messageSk }}
            </v-snackbar>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer, remote } from "electron";
import { Component, Vue } from "vue-property-decorator";
import { RxItemsCollections, RxTimeDocument } from "@/RxDB";

import Config from "@/plugins/electronStore";
import DatabaseService from "@/plugins/database";
import Dolibarr from "@/plugins/dolibarr";
import Filters from "@/components/App/Filters.vue";
import Header from "@/components/App/Header.vue";
import HomePage from "@/components/App/HomePage.vue";
import Login from "@/components/App/Login.vue";
import Notifications from "@/components/App/Notifications.vue";
import Panel from "@/components/App/Panel.vue";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
// @ts-ignore
import iconNotif from "./assets/images/logo-notif.png";
import EventBus from "./plugins/eventBus";

@Component({
    components: { Login, HomePage, Header, Panel, Filters, Notifications },
})
export default class App extends Vue {
    private timeCurrent: RxTimeDocument | null = null;
    private sub: Subscription | null = null;
    private db!: RxDatabase<RxItemsCollections>;
    private messageSk = "";
    private durationSk = 3000;
    private snackbar = false;

    private lastCheckNotif = new Date();
    private intervalIdle: NodeJS.Timeout | null = null;

    public async mounted() {
        console.log("[App] mounted : " + process.env.VUE_APP_DOLIBARR_HOST);

        this.db = await DatabaseService.get();
        this.sub = this.db.times
            .findOne({
                selector: {
                    isCurrent: 1,
                },
            })
            .$.subscribe((time) => {
                this.timeCurrent = time;
            });

        ipcRenderer.on("logout", () => {
            Dolibarr.logout();
            EventBus.$emit("APP_LOGOUT");
        });

        ipcRenderer.on("openFromLink", async (event, arg) => {
            console.log("[APP] OpenFromLink"); 
            console.log(arg);
            
            const db = await DatabaseService.get();
            await DatabaseService.stopCurrent();

            const obj = DatabaseService.getNewTimeObj();
            obj.isCurrent = 1;
            obj.title = arg.title;
            if(arg.taskId) {
                obj.taskId = arg.taskId;
            } else {
                obj.isPersonal = 1;
            }
            await db.times.insert(obj);
        });

        await this.synchro();
        ipcRenderer.on("synchronize", async () => {
            await this.synchro();
        });

        EventBus.$on("APP_SYNCHRONIZE_RUN", async () => {
            await this.synchro();
        });

        EventBus.$on("SHOW_SNAKBAR", (mes: string, duration = 3000) => {
            if (mes) {
                this.messageSk = mes;
                this.durationSk = duration;
                this.snackbar = true;
            }
        });

        document.addEventListener("keydown", this.handleShortcuts.bind(this));

        if (this.intervalIdle) {
            clearInterval(this.intervalIdle);
        }
        this.intervalIdle = setInterval(this.checkIdleTime, 30000); //Check every 30s the idle time

        setInterval(this.checkNoTimeRunning, 10000);
    }

    public async checkNoTimeRunning() {
        const now = new Date();
        const diffTime =
            Math.abs(now.getTime() - this.lastCheckNotif.getTime()) / 1000 / 60; //Diff in minutes

        const prefStart = Config.get("preferences.notifStart");

        if (!prefStart || this.timeCurrent || Math.round(diffTime) < 5) return;

        const notification = {
            title: "Pensez à tracker votre temps",
            body: "On arrête de se tourner les pouces et on bosse !",
            icon: iconNotif,
        };

        const notifTime = new window.Notification(
            notification.title,
            notification
        );

        notifTime.onclick = () => {
            if (!this.timeCurrent) {
                const obj = DatabaseService.getNewTimeObj();
                obj.isPersonal = 1;
                obj.isCurrent = 1;

                this.db.times.insert(obj);
                ipcRenderer.invoke("show_foreground");
            }
        };
        this.lastCheckNotif = new Date();
    }

    public async checkIdleTime() {
        const prefAway: boolean = Config.get("preferences.notifAway");
        const prefAwayDelay: number = Config.get("preferences.notifAwayDelay");

        //If inative for the last 5min, popup info
        if (
            prefAway &&
            this.timeCurrent &&
            remote.powerMonitor.getSystemIdleTime() > prefAwayDelay * 60
        ) {
            await ipcRenderer.invoke("openWindow", "popupIdle");
        }
    }

    async synchro() {
        this.messageSk = "Synchronisation en cours...";
        this.durationSk = 30000;
        this.snackbar = true;

        const db = await DatabaseService.get();
        const items = await db.times
            .find({
                selector: {
                    $or: [
                        { needInsert: 1 },
                        { needUpdate: 1 },
                        { needRemove: 1 },
                    ],
                },
            })
            .exec();

        await Promise.all(
            items.map(async (i) => {
                await Dolibarr.updateDolibarr(i);
            })
        );

        const syncs = [
            Dolibarr.getClients(),
            Dolibarr.getProjects(),
            Dolibarr.getTasks(),
            Dolibarr.getTimes(),
            Dolibarr.getHolidays()
        ];

        await Promise.all(syncs).then((results) => {
            const checker = results.every((v) => v === true);

            if (checker == true) {
                console.log("[HP] Sync done");

                this.messageSk = "Synchronisation terminée !";
                this.durationSk = 2000;
                EventBus.$emit("APP_SYNCHRONIZE_DONE");
            } else {
                console.log("[HP] Sync failed");
                this.messageSk =
                    "La synchronisation a échoué. Réessayez ou reconnectez-vous.";
                this.durationSk = 10000;
            }
        });
    }

    public async handleShortcuts(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.code.startsWith("Digit")) {
            e.preventDefault();
            const digit = parseInt(e.code.replace("Digit", ""));

            const obj = DatabaseService.getNewTimeObj();
            obj.isCurrent = 1;
            if (digit == 0) {
                obj.isPersonal = 1;
            } else {
                const favT = await this.db.favorites
                    .findOne({
                        selector: {
                            position: digit,
                        },
                    })
                    .exec();

                if (favT) {
                    obj.taskId = favT.taskId;
                } else {
                    return;
                }
            }
            await DatabaseService.stopCurrent();
            await this.db.times.insert(obj);
        }
    }

    public beforeDestroy() {
        document.removeEventListener("keydown", this.handleShortcuts);
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
}
</script>

<style scoped lang="scss">
.v-application {
    font-family: Arial, sans-serif !important;
    font-size: 16px;
    .title {
        // To pin point specific classes of some components
        font-family: Arial, sans-serif !important;
        font-size: 16px;
    }

    header {
        height: 68px !important;
    }

    main {
        padding-top: 68px !important;
    }
}
</style>
