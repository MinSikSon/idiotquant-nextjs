import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    base: "./",
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        host: true,   // 같은 망의 폰에서 열어 보려면 필요하다. 이 게임은 폰이 본체다.
        port: 5173,
    },
    build: {
        target: "es2022",
        // Phaser 하나가 번들의 대부분이다. 따로 떼 두면 게임 코드만 고쳤을 때
        // 브라우저가 엔진을 다시 받지 않는다.
        // Vite 8 은 rolldown 이라 manualChunks 가 **함수만** 받는다(객체 형식은 빠졌다).
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes("node_modules/phaser")) return "phaser";
                    return undefined;
                },
            },
        },
        chunkSizeWarningLimit: 1600,
    },
});
