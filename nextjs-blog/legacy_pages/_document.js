import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

class MyDocument extends Document {
    render() {
        return (
            <Html>
                <Head>
                    <title>투자 전략 | 한국주식 퀀트 필터링 종목추천</title>
                    <meta name="description" content="한국주식에 대한 퀀트적인 분석과 필터링을 통해 적합한 종목을 추천하는 웹 페이지입니다. 효율적인 퀀트 투자 전략을 기반으로 한국 주식 시장에서 가치 있는 투자 대상을 찾아드립니다." />
                    <link rel="icon" href="/images/icons8-algorithm-flatart-icons-lineal-color-32.png" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
                    <Script
                        async
                        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
                        crossorigin="anonymous"
                        strategy="lazyOnload"
                        onLoad={() =>
                            console.log(`script loaded correctly, window.FB has been populated`)
                        }
                    />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}

export default MyDocument;