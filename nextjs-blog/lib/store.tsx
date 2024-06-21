// import { createStore } from "redux";
// import {  createReducer } from "@reduxjs/toolkit"
import { configureStore, createAction, createSlice } from "@reduxjs/toolkit"


import { createWrapper } from 'next-redux-wrapper';
import thunk from 'redux-thunk';
import rootReducer from './reducers'; // rootReducer는 여러분의 리듀서를 결합한 것입니다.
// 1. Redux 스토어와 next-redux-wrapper를 설정

interface Config {
    reducer: any;
    middleware: any;
}
const initConst: Config = {
    reducer: rootReducer,
    middleware: [thunk]
}
const makeStore = () => configureStore(initConst);
export const wrapper = createWrapper(makeStore);






const addToDo = createAction("ADD");
const deleteToDo = createAction("DELETE");

console.log(addToDo(), addToDo.type);
console.log(deleteToDo(), deleteToDo.type);

// const reducer = (state = [], action) => {
//     switch (action.type) {
//         case addToDo.type:
//             console.log(`reducer ADD`, action);
//             return [{ text: action.payload, id: Date.now() }, ...state];
//         case deleteToDo.type:
//             console.log(`reducer DELETE`, action);
//             return state.filter(item => item.id !== action.payload);
//         default:
//             return state;
//     }
// }

// const initialState = [];
// // return 한다는 것 -> newState (mutate 인 경우 return x, immutate 인 경우 return)
// const reducer = createReducer(initialState, (builder) => {
//     builder
//         .addCase(addToDo, (state, action) => {
//             state.push({ text: action.payload, id: Date.now() });
//             console.log(`reducer ADD`, state.toDos);
//         })
//         .addCase(deleteToDo, (state, action) => {
//             console.log(`reducer DELETE`, state.toDos);
//             console.log(`action`, action);
//             const newState = state.filter(item => item.id !== action.payload);
//             console.log(`newState`, newState);
//             return newState;
//         })
// });

interface Todo {
    text: string;
    id: number;
}
const initState: Todo[] = [];
const toDos = createSlice({
    name: 'toDosReducer',
    initialState: initState,
    reducers: {
        add: (state, action) => {
            state.push({ text: action.payload, id: Date.now() });
        },
        remove: (state, action) => state.filter(item => item.id !== action.payload),
    }
})

// const store = createStore(reducer);
// const store = configureStore({ reducer });
const store = configureStore({ reducer: toDos.reducer });
console.log(toDos.actions);

// export const actionCreators = {
//     addToDo,
//     deleteToDo,
// }
export const {
    add, remove
} = toDos.actions;

export default store;