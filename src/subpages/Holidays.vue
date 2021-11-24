<template>
    <v-app>
        <div class="title">Congés</div>
        <v-main>
            <template>
                <v-simple-table>
                    <template v-slot:default>
                    <thead>
                        <tr>
                            <th class="text-left">Nom</th>
                            <th class="text-left">Début</th>
                            <th class="text-left">Fin</th>
                            <th class="text-left">Détail</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                        v-for="item in holidays"
                        :key="item.id"
                        >
                        <td>{{ item.fullname }}</td>
                        <td>{{ item.getDateStart() }}</td>
                        <td>{{ item.getDateEnd() }}</td>
                        <td>{{ item.description }}</td>
                        </tr>
                    </tbody>
                    </template>
                </v-simple-table>
            </template>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer } from "electron";
import { Component, Vue } from "vue-property-decorator";

import { RxItemsCollections, RxHolidayDocument } from "@/RxDB";
import DatabaseService from "@/plugins/database";

import { RxDatabase } from "rxdb";

@Component({
    components: { },
})
export default class Holidays extends Vue {
    private holidays: RxHolidayDocument[] = [];

    private db!: RxDatabase<RxItemsCollections>;
    
    public created() {
        window.addEventListener(
            "beforeunload",
            function() {
                //@ts-ignore
                this.$destroy();
            }.bind(this)
        );
    }

    public async mounted() {
        this.db = await DatabaseService.get();

        await this.generateTableData();
    }

    public async generateTableData() {
        this.holidays = await this.db.holidays
            .find()
            .exec();
    }

    // public close() {

    // }

    public async beforeDestroy() {
        await ipcRenderer.invoke("closeWindow", "holidays");
    }
}
</script>

<style scoped lang="scss">
.v-application {
    font-family: Arial, sans-serif !important;
    font-size: 16px;
    .title {
        font-family: Arial, sans-serif !important;
        font-size: 16px;
        color: white;
        background-color: var(--v-primary-base);
        text-align: center;
        padding: 5px;
    }
}
</style>
