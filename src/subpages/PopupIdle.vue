<template>
    <v-app>
        <v-main>
            <v-container>
                <p class="title">Vous êtes inactif depuis {{ timeInHMS() }}</p>

                <div class="actions">
                    <v-btn
                        elevation="2"
                        v-on:click="continueTime()"
                        color="green white--text"
                    >
                        Continuer
                    </v-btn>
                    <v-btn
                        elevation="2"
                        v-on:click="stopTime()"
                        color="red white--text"
                    >
                        Arrêter à {{ timeInHMS() }}
                    </v-btn>
                    <v-btn
                        elevation="2"
                        v-on:click="discardTime()"
                        class="red lighten-3 white--text"
                    >
                        Arrêter à {{ timeInHMS() }} et reprendre
                    </v-btn>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer } from "electron";
import { Component, Vue } from "vue-property-decorator";

import Config from "@/plugins/electronStore";
import DatabaseService from "@/plugins/database";

@Component({})
export default class PopupIdle extends Vue {
    private dateOpened = new Date();

    public created() {
        window.addEventListener(
            "beforeunload",
            function() {
                //@ts-ignore
                this.$destroy();
            }.bind(this)
        );
    }

    public mounted() {
        const prefAwayDelay: number = Config.get("preferences.notifAwayDelay");
        this.dateOpened = new Date(
            new Date().getTime() - prefAwayDelay * 60 * 1000
        );
    }

    public timeInHMS() {
        return (
            this.dateOpened.getHours() +
            "h" +
            (this.dateOpened.getMinutes() < 10 ? "0" : "") +
            this.dateOpened.getMinutes()
        );
    }

    public async continueTime() {
        this.$destroy();
    }

    public async stopTime() {
        await DatabaseService.stopCurrent(this.dateOpened);
        this.$destroy();
    }

    public async discardTime() {
        await DatabaseService.stopCurrent(this.dateOpened, true);
        this.$destroy();
    }

    public async beforeDestroy() {
        await ipcRenderer.invoke("closeWindow", "popupIdle");
    }
}
</script>

<style scoped lang="scss">
.v-application {
    font-family: Arial, sans-serif !important;
    font-size: 16px;
    .title {
        text-align: center;
    }

    .actions {
        display: flex;
        flex-flow: column;
        justify-content: space-between;

        button {
            margin: 10px 0;
            text-transform: none;
        }
    }
}
</style>
