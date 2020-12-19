module.exports = {
    transpileDependencies: ["vuetify"],
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            externals: ["keytar"],
            builderOptions: {
                productName: "Magina Timer",
                artifactName: "${productName}-${version}.${ext}",
                // forceCodeSigning: true,
                publish: [
                    {
                        provider: "github",
                        owner: "valentin-debris",
                        private: true,
                        // releaseType: draf/release
                    },
                ],
            },
        },
    },
    pages: {
        index: {
            entry: "src/main.ts",
            title: "Magina Timer",
        },
        planning: {
            entry: "src/subpages/planning.ts",
            title: "MGT - Planning",
        },
        popupIdle: {
            entry: "src/subpages/popupIdle.ts",
            title: "MGT - WAKE UP !",
        },
        preferences: {
            entry: "src/subpages/preferences.ts",
            title: "MGT - Préférences",
        },
        timeExport: {
            entry: "src/subpages/timeExport.ts",
            title: "MGT - Export",
        },
    },
    chainWebpack: (config) => {
        // Xlsx
        config.module
            .rule("xlsx")
            .test(/\.xlsx$/)
            .use("webpack-xlsx-loader")
            .loader("webpack-xlsx-loader")
            .end();
    },
};
