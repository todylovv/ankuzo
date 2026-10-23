const path=require('node:path');
const fs=require('node:fs');
const result=require('esbuild').buildSync({entryPoints:[require.resolve('music-metadata')],bundle:true,platform:'node',format:'cjs',target:'node22',minify:true,legalComments:'linked',metafile:true,outfile:path.join(__dirname,'../app/vendor/audio-metadata.cjs')});
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
 let directory=path.dirname(path.resolve(input));
 while(path.dirname(directory)!==directory){
  const manifest=path.join(directory,'package.json');
  if(fs.existsSync(manifest)){const metadata=JSON.parse(fs.readFileSync(manifest,'utf8'));if(metadata.name){packages.set(directory,metadata);break;}}
  directory=path.dirname(directory);
 }
}
let licenses='Generated dependency notices for audio-metadata.cjs\n';
for(const [directory,metadata]of packages){
 licenses+='\n'+metadata.name+' '+metadata.version+' ('+metadata.license+')\n';
 for(const name of fs.readdirSync(directory))if(/^(licen[sc]e|notice)(\.|$)/i.test(name))licenses+=fs.readFileSync(path.join(directory,name),'utf8')+'\n';
}
fs.writeFileSync(path.join(__dirname,'../app/vendor/LICENSES.txt'),licenses);
