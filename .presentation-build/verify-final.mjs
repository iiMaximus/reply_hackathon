import fs from 'node:fs/promises';
import {FileBlob, PresentationFile} from '@oai/artifact-tool';
const base='/home/The_untextured/source/reply-hackathon';
const p=await PresentationFile.importPptx(await FileBlob.load(`${base}/submission/rick-max-pitch/Rick-and-Max-QAI-60-seconds.pptx`));
for(const [i,slide] of p.slides.items.entries()){
 const blob=await p.export({slide,format:'png',scale:1});
 await fs.writeFile(`${base}/.presentation-build/final-${i+1}.png`,new Uint8Array(await blob.arrayBuffer()));
}
console.log(`Rendered ${p.slides.items.length} final slides.`);
