import {
  calculateKrNcav,
  calculateKrSRIM,
  calculateKrDCF,
  calculateKrMultipliers,
  calculateKrPbrBand,
  calculateUsNcav,
  calculateUsSRIM,
  calculateUsPEG,
  calculateUsDCF,
  calculateUsMultipliers,
  type ValuationResult,
} from "./financeCalc";

export function valuationModels(data: any, isUs: boolean): { type: string; result: ValuationResult }[] {
    const list: { type: string; result: ValuationResult }[] = [];
    if (isUs) {
      if (data?.finnhubData && data?.usDetail) {
        const ncav = calculateUsNcav(data.finnhubData, data.usDetail);
        if (typeof ncav !== "string") list.push({ type: "NCAV", result: ncav });
        const srim = calculateUsSRIM(data.finnhubData, data.usDetail);
        if (typeof srim !== "string") list.push({ type: "SRIM", result: srim });
        const peg = calculateUsPEG(data.finnhubData, data.usDetail);
        if (typeof peg !== "string") list.push({ type: "PEG", result: peg });
        const dcf = calculateUsDCF(data.finnhubData, data.usDetail);
        if (typeof dcf !== "string") list.push({ type: "DCF", result: dcf });
        const per = calculateUsMultipliers(data.finnhubData, data.usDetail);
        if (typeof per !== "string") list.push({ type: "PER", result: per });
      }
    } else {
      if (data?.kiBS && data?.kiChart) {
        const ncav = calculateKrNcav(data.kiBS, data.kiChart);
        if (ncav) list.push({ type: "NCAV", result: ncav });
        const pbr = calculateKrPbrBand(data.kiBS, data.kiChart);
        if (pbr) list.push({ type: "PBR", result: pbr });
        if (data?.kiIS) {
          const srim = calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart);
          if (srim) list.push({ type: "SRIM", result: srim });
          const per = calculateKrMultipliers(data.kiBS, data.kiIS, data.kiChart);
          if (per) list.push({ type: "PER", result: per });
        }
        if (data?.kiCF) {
          const dcf = calculateKrDCF(data.kiCF, data.kiChart);
          if (dcf) list.push({ type: "DCF", result: dcf });
        }
      }
    }
    return list;
}
