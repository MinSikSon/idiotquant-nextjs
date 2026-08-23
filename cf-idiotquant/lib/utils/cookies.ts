"use client"

const DEBUG = false;

export function escapeSpecialCharacters(url: any) {
    // 특수 문자를 정의합니다.
    const specialCharacters = /[!#$%&'()*+,/:;=?@[\]<>\\^`{|}~.]/g;

    // 특수 문자 앞에 백슬래시를 추가합니다.
    return url.replace(specialCharacters, (match: any) => '\\' + match);
}

export const registerCookie = (key: string, value: string) => {
    document.cookie = `${key}=${value}; path=/; expires=Fri, 31 Dec 2025 23:59:59 GMT`; // [NOTE] 만료일 임시 설정
}

export const clearCookie = (key: string) => {
    document.cookie = `${key}=; path=/; expires=Fri, 31 Dec 2025 23:59:59 GMT`; // [NOTE] 만료일 임시 설정
}

export const getCookie = (name: string) => {
    if (DEBUG) console.log(`[getCookie] name:`, name);
    if (DEBUG) console.log(`[getCookie] document.cookie:`, document.cookie);
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith(name + "="))
        ?.split("=")[1];

    if (undefined == cookie) {
        return "";
    }

    return cookie;
};

export const isValidCookie = (name: string) => {
    const cookie = getCookie(name);
    if (undefined == cookie) {
        return false;
    }

    if ("\"\"" == cookie) {
        return false;
    }

    if ("" == cookie) {
        return false;
    }

    return true;
};
