<template>
    <div class="filters">
        <ul class="elems">
            <li>
                <v-switch
                    v-model="personalOnly"
                    label="Uniquement les 'Personnels'"
                    color="primary"
                    hide-details
                ></v-switch>
            </li>
            <li>
                <v-row>
                    <v-col cols="auto">
                        Afficher sur </v-col
                    ><v-col cols="2" class="days">
                        <v-text-field
                            v-model="nbDays"
                            type="number"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="auto">
                        jours
                    </v-col>
                </v-row>
            </li>
        </ul>
        <div class="icon"><i class="fas fa-filter"></i></div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import Config from "@/plugins/electronStore";

@Component({})
export default class Filters extends Vue {
    private personalOnly = false;
    private nbDays = 14;

    @Watch('personalOnly')
    async onChangePerso(item: boolean) {
        Config.set('personalOnly', item);
    }
    @Watch('nbDays')
    async onChangeDays(item: string) {
        Config.set('defaultListingLastDays', parseInt(item));
    }


    public async mounted() {
        this.initValues();
        Config.onDidChange("defaultListingLastDays", this.initValues);
    }

    public initValues() {
        this.personalOnly = Config.get("personalOnly");
        this.nbDays = Config.get("defaultListingLastDays");
    }
}
</script>

<style scoped lang="scss">
.filters {
    position: fixed;
    left: 1px;
    bottom: 1px;
    padding: 2px;

    .elems {
        display: none;
        background: #f7f7f7;
        border: 1px solid #b7b7b7;
        border-radius: 5px;
        margin: 0;
        margin-bottom: 4px;
        padding: 5px 5px 5px 20px;

        .days {
            padding: 0px;
            .v-text-field {
                padding: 0px;
            }
        }
    }

    &:hover {
        .elems {
            display: block;
        }
    }
}
</style>
