import * as grpc from '@grpc/grpc-js';
import { CogServiceService as CogService } from '../proto/cog_grpc_pb';
import { Cog } from './cog';
import { ClientWrapper } from '../client/client-wrapper';
import { TypedServerOverride } from './typed-server-override';

const server = new TypedServerOverride();
const port = process.env.PORT || 28866;
const host = process.env.HOST || '0.0.0.0';
let credentials: grpc.ServerCredentials;

if (process.env.USE_SSL) {
  credentials = grpc.ServerCredentials.createSsl(
    Buffer.from(process.env.SSL_ROOT_CRT, 'base64'), [{
      cert_chain: Buffer.from(process.env.SSL_CRT, 'base64'),
      private_key: Buffer.from(process.env.SSL_KEY, 'base64'),
    }],
    true,
  );
} else {
  credentials = grpc.ServerCredentials.createInsecure();
}

server.addServiceTyped(CogService, new Cog(ClientWrapper));
server.bindAsync(`${host}:${port}`, credentials, (err, port) => {
  if (err) {
    throw err;
  }
  server.start();
  console.log(`Server started, listening: ${host}:${port}`);
});

// Export server for testing.
export default server;
