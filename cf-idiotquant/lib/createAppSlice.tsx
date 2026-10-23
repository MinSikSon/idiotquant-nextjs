import { asyncThunkCreator, buildCreateSlice } from "@reduxjs/toolkit";
import { reducerRegistry } from "./reducerRegistry";

const buildSlice = buildCreateSlice({
    creators: { asyncThunk: asyncThunkCreator },
});

export const createAppSlice: typeof buildSlice = (options) =>
    buildSlice(options).injectInto(reducerRegistry);
