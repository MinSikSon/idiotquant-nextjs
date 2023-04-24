import Head from "next/head";
import Image from "next/image";
import "tailwindcss/tailwind.css";

export default function Home() {
  return (
    <div>
      <Head>
        <title>Create Next App</title>
        {/* <link rel="icon" href="/favicon.ico" /> */}
        <link rel="icon" href="/images/profile.jpeg" />
      </Head>

      <main>
        {/* <h1 className={styles.title}> */}
        <h1 className="text-3xl font-bold underline">
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>

        <img
          src="/images/profile.jpeg"
          alt="Your Name"
          width={144}
          height={144}
        />

        <Image
          src="/images/profile.jpeg"
          alt="Your Name"
          width={144}
          height={144}
        />

        <p className="bg-red-500">
          Get started by editing <code>pages/index.js</code>
        </p>

        <div className="bg-red-500">
          <a href="https://nextjs.org/docs" className="bg-red-500">
            <h3>Documentation &rarr;</h3>
            <p>Find in-depth information about Next.js features and API.</p>
          </a>

          <a href="https://nextjs.org/learn" className="bg-red-500">
            <h3>Learn &rarr;</h3>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </a>

          <a
            href="https://github.com/vercel/next.js/tree/master/examples"
            className="bg-red-500"
          >
            <h3>Examples &rarr;</h3>
            <p>Discover and deploy boilerplate example Next.js projects.</p>
          </a>

          <a
            href="https://vercel.com/import?filter=next.js&utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className="bg-red-500"
          >
            <h3>Deploy &rarr;</h3>
            <p>
              Instantly deploy your Next.js site to a public URL with Vercel.
            </p>
          </a>
        </div>
      </main>

      <footer>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <img src="/vercel.svg" alt="Vercel" className="bg-red-500" />
        </a>
      </footer>
    </div>
  );
}
