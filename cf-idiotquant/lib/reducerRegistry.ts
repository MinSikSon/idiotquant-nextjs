import { combineSlices } from '@reduxjs/toolkit';

// 각 화면이 slice를 import할 때 등록한다. 루트에서 기능 전체를 가져오지 않는다.
export const reducerRegistry = combineSlices({});
