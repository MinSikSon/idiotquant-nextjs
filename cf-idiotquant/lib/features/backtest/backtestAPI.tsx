import { apiRequest } from "../apiRequest";

export const getFinancialInfoWithMarketInfo: any = (year: string, quarter: string) =>
    apiRequest(`/stock/financial-info-with-market-info?year=${year}&quarter=${quarter}`);

export const getUsNcavList: any = () => apiRequest(`/strategy/us/ncav/list`);

export const getNcavLatest: any = () => apiRequest(`/strategy/all/ncav/date/latest`);
