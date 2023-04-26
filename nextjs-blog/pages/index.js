import Head from "next/head";
import Image from "next/image";
import Link from "next/link"; // "client-side navigation" and "Prefetching"
import Script from "next/script";

import "tailwindcss/tailwind.css";

export default function Home() {
  return (
    <div>
      <Head>
        <title>퀀트 종목 추천</title>
        <link rel="icon" href="/images/profile.jpeg" />
      </Head>
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
        crossorigin="anonymous"
        strategy="lazyOnload"
        onLoad={() =>
          console.log(`script loaded correctly, window.FB has been populated`)
        }
      />
      <main className="flex flex-col justify-center">
        {/* <h1 className="text-3xl font-bold underline">
          Read <Link href="/posts/first-post">first-post</Link>
        </h1> */}

        {/* <img
          src="/images/profile.jpeg"
          alt="Your Name"
          width={144}
          height={144}
        /> */}

        <div className="flex justify-center">
          <Image
            className="rounded-full"
            src="/images/profile.jpeg"
            alt="Your Name"
            width={144}
            height={144}
          />
        </div>
        <p className="flex justify-center text-3xl text-blue-500 font-bold">
          Peter Son
        </p>
        <p className=" bg-red-300 flex justify-center">
          Get started by editing <code>pages/index.js</code>
        </p>

        <div className="bg-transparent flex flex-col justify-center">
          <div className="bg-red-400 flex justify-center">
            <a href="https://nextjs.org/docs" >
              <h3 >Documentation &rarr;</h3>
              <p>Find in-depth information about Next.js features and API.</p>
            </a>
          </div>
          <div className="bg-red-300 flex justify-center">
            <a href="https://nextjs.org/learn" >
              <h3>Learn &rarr;</h3>
              <p>Learn about Next.js in an interactive course with quizzes!</p>
            </a>
          </div>

          <div className="bg-red-400 flex justify-center">
            <a
              href="https://github.com/vercel/next.js/tree/master/examples"
            >
              <h3>Examples &rarr;</h3>
              <p>Discover and deploy boilerplate example Next.js projects.</p>
            </a>
          </div>

          <div className="bg-red-300 flex justify-center">
            <a
              href="https://vercel.com/import?filter=next.js&utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            >
              <h3>Deploy &rarr;</h3>
              <p>
                Instantly deploy your Next.js site to a public URL with Vercel.
              </p>
            </a>
          </div>
        </div>
      </main>

      <footer>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-400"
        >
          Powered by{" "}
          <img src="/vercel.svg" alt="Vercel" className="bg-red-300" />
        </a>
      </footer>
    </div>
  );
}
