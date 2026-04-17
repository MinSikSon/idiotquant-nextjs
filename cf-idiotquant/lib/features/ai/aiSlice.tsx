import { createAppSlice } from "@/lib/createAppSlice";
import { postLaboratory } from "./aiAPI";
import { PayloadAction } from "@reduxjs/toolkit";
import { clearStream, updateStreamingOutput } from "./aiStreamSlice";

interface AiType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
}

const initialState: AiType = {
    state: "init",
}

export const aiSlice = createAppSlice({
    name: "aiSlice",
    initialState,
    reducers: (create) => ({
        reqPostLaboratory: create.asyncThunk(
            async ({ system_content, user_content }: { system_content: string, user_content: string }, { dispatch }) => {
                dispatch(clearStream());

                const res = await postLaboratory(system_content, user_content);
                const reader = res.body?.getReader();
                const decoder = new TextDecoder('utf-8');
                let output = '';

                // console.log(`[reqPostLaboratory]`, `Stream processing`);
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk: any = decoder.decode(value, { stream: true });
                    output += chunk;
                    dispatch(updateStreamingOutput(chunk));
                }

                return { output };
            },
        ),
    }),

    selectors: {
        selectAiState: (state) => state.state,
    }
});

export const { reqPostLaboratory, } = aiSlice.actions;
export const { selectAiState, } = aiSlice.selectors;