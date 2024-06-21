import type { AppProps } from 'next/app'
import { wrapper } from '../lib/store';

const MyApp = ({ Component, pageProps }: AppProps) => {
  return <Component {...pageProps} />;
};

export default wrapper.withRedux(MyApp);