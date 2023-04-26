import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout';

export default function FirstPost() {
    return (
        <Layout>
            <Head>
                <title>First Post</title>
                <script src="https://connect.facebook.net/en_US/sdk.js" />
            </Head>
            <h1>First Post</h1>
            <h2>
                <Link href="/">← Back to home</Link>
            </h2>
        </Layout>
    );
}