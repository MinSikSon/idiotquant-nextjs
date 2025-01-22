export function getRandomMainImage(idx: any = undefined) {
    const imageList: string[] = [
        'https://www.investopedia.com/thmb/cOymT7ainOZSwk5xh7KmI0CfRME=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/Stock_source-d84b531c2d3441a7a0611e8af4d9d750.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/1/1e/Vereinigte_Ostindische_Compagnie_bond_-_Middelburg_-_Amsterdam_-_1622.jpg',
        'https://cdn.pixabay.com/photo/2016/11/18/18/37/sacks-1836329_1280.jpg',
        'https://cdn.pixabay.com/photo/2024/01/06/02/44/ai-generated-8490532_1280.png',
        'https://cdn.pixabay.com/photo/2019/11/10/12/35/sheep-4615685_1280.jpg',

    ];
    if (undefined == idx) {
        idx = Math.floor(Math.random() * imageList.length);
    }
    else {
        idx = idx % imageList.length;
    }
    return imageList[idx];
}

export function getRandomUserImage(idx: any = undefined) {
    const imageList: string[] = [
        'https://cdn.pixabay.com/photo/2021/11/12/03/04/woman-6787784_1280.png',
        'https://cdn.pixabay.com/photo/2022/02/04/03/06/woman-6991826_1280.png',
        'https://cdn.pixabay.com/photo/2023/10/25/17/21/anxiety-8340943_640.png',
        'https://cdn.pixabay.com/photo/2023/11/27/20/29/autumn-8416137_1280.png',
        'https://cdn.pixabay.com/photo/2013/07/12/14/45/apollo-148722_1280.png',
        'https://cdn.pixabay.com/photo/2023/10/30/20/45/ai-generated-8353780_1280.png',

    ];
    if (undefined == idx) {
        idx = Math.floor(Math.random() * imageList.length);
    }
    else {
        idx = idx % imageList.length;
    }
    return imageList[idx];
}