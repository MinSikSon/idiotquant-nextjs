export const postSearchLog = async (data: { ticker: string; name: string; isUs: boolean }) => {
    const url = `/api/proxy/api/search-log/`;
    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json; utf-8" },
        body: JSON.stringify(data)
    });
    return res.json();
};

export const getSearchLog = async (count: string) => {
    const url = `/api/proxy/api/search-log/`;
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { 
            "content-type": "application/json; utf-8",
            "count": count 
        },
    });
    return res.json();
};