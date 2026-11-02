import{serveCandidate}from'./serve-candidate.mjs';
const server=await serveCandidate();process.env.CODIGOLAB_URL=server.url;
try{await import('./smoke.mjs');await import('./expanded-smoke.mjs')}finally{await server.close()}
