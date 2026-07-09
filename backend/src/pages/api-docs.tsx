import dynamic from 'next/dynamic';
import Head from 'next/head';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <>
      <Head>
        <title>WATI Admin API Docs</title>
      </Head>
      <SwaggerUI
        url="/api/openapi.json"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        persistAuthorization
      />
    </>
  );
}
