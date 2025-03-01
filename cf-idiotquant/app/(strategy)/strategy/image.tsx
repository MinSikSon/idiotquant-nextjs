export function getRandomMainImage(idx: any = undefined) {
    const imageList: string[] = [
        'https://www.artic.edu/iiif/2/020a1c1d-f108-9684-aa57-11fc1d41102f/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/cc8c005c-1a21-13dd-9a40-795e43c4c5c5/full/843,/0/default.jpg',
        'https://www.artic.edu/iiif/2/a8ec2022-4d52-9ee1-18a9-d7bc35e45b41/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/ea81dbe1-8f50-896e-81f6-253fe24cf5f7/full/843,/0/default.jpg',

        // 'https://www.artic.edu/iiif/2/0f1cc0e0-e42e-be16-3f71-2022da38cb93/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/95be2572-b53d-8e7b-abc9-10eb48d4fa5d/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/b0effb1c-ff23-bbaa-f809-9fd94e31c1a0/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/4d1b3ad0-14db-0d21-ad9f-17abb8bdfbb5/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/66f95ea3-a11a-1cf4-6599-d0a49bb25744/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/f8fd76e9-c396-5678-36ed-6a348c904d27/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/18092196-50ae-3ff1-9205-1b3110e966c3/full/400,/0/default.jpg',

        // 'https://www.investopedia.com/thmb/cOymT7ainOZSwk5xh7KmI0CfRME=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/Stock_source-d84b531c2d3441a7a0611e8af4d9d750.jpg',
        // 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Vereinigte_Ostindische_Compagnie_bond_-_Middelburg_-_Amsterdam_-_1622.jpg',
        // 'https://cdn.pixabay.com/photo/2016/11/18/18/37/sacks-1836329_1280.jpg',
        // 'https://cdn.pixabay.com/photo/2024/01/06/02/44/ai-generated-8490532_1280.png',
        // 'https://cdn.pixabay.com/photo/2019/11/10/12/35/sheep-4615685_1280.jpg',

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
    // console.log(`getRandomUserImage`, idx);
    const imageList: string[] = [
        'https://www.artic.edu/iiif/2/fa3a6e30-09ce-5c9e-5cba-a682ca4d56e7/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/900872f5-b9b1-aa21-1d56-401707024644/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/25c6ea3d-6703-57ff-ce28-4ec612f56cfe/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/9a0fdeae-2f6f-12e9-0f3e-60f1e65a46d9/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/2839ccc3-8fbb-73d4-54fc-4fe640b4da3e/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/671c6468-27e6-3afb-74cc-0626fdbb03fa/full/1686,/0/default.jpg',
        'https://www.artic.edu/iiif/2/c038b5e0-c4b7-553c-17dc-a32ac4c3ac06/full/1686,/0/default.jpg',

        // 'https://www.artic.edu/iiif/2/47c5bcb8-62ef-e5d7-55e7-f5121f409a30/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/3a608f55-d76e-fa96-d0b1-0789fbc48f1e/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/78c80988-6524-cec7-c661-a4c0a706d06f/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/3f9aa9db-61e1-7060-fdb0-bfd7e41ddd08/full/400,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/0675f9a9-1a7b-c90a-3bb6-7f7be2afb678/full/1686,/0/default.jpg',
        // 'https://www.artic.edu/iiif/2/d19683c2-2ef4-e586-7add-c1008b6a8fb2/full/400,/0/default.jpg',

        // 'https://cdn.pixabay.com/photo/2021/11/12/03/04/woman-6787784_1280.png',
        // 'https://cdn.pixabay.com/photo/2022/02/04/03/06/woman-6991826_1280.png',
        // 'https://cdn.pixabay.com/photo/2023/10/25/17/21/anxiety-8340943_640.png',
        // 'https://cdn.pixabay.com/photo/2023/11/27/20/29/autumn-8416137_1280.png',
        // 'https://cdn.pixabay.com/photo/2013/07/12/14/45/apollo-148722_1280.png',
        // 'https://cdn.pixabay.com/photo/2023/10/30/20/45/ai-generated-8353780_1280.png',

    ];
    if (undefined == idx) {
        const random = Math.random();
        idx = Math.floor(random * imageList.length);
        // console.log(`random`, random, `imageList.length`, imageList.length, `idx`, idx,);
    }
    else {
        idx = idx % imageList.length;
    }
    return imageList[idx];
}