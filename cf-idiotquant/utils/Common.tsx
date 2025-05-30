//////////////////////////////////////////////////////////////////////////////
// Util

export function escapeSpecialCharacters(url: any) {
    // 특수 문자를 정의합니다.
    const specialCharacters = /[!#$%&'()*+,/:;=?@[\]<>\\^`{|}~.]/g;

    // 특수 문자 앞에 백슬래시를 추가합니다.
    return url.replace(specialCharacters, (match: any) => '\\' + match);
}
